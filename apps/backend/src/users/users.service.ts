import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleName, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { generateOpaqueToken } from '../common/utils/hash.util';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { InviteUserDto } from './dto/invite-user.dto';
import type { UpdateMemberDto } from './dto/update-member.dto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Which roles a given inviter role is allowed to grant. Managers are deliberately
// barred from minting MANAGER/ADMIN accounts to avoid lateral privilege escalation.
const ALLOWED_INVITE_ROLES: Record<RoleName, RoleName[]> = {
  [RoleName.ADMIN]: [
    RoleName.CUSTOMER,
    RoleName.AGENT,
    RoleName.SENIOR_AGENT,
    RoleName.MANAGER,
    RoleName.ADMIN,
  ],
  [RoleName.MANAGER]: [RoleName.CUSTOMER, RoleName.AGENT, RoleName.SENIOR_AGENT],
  [RoleName.SENIOR_AGENT]: [],
  [RoleName.AGENT]: [],
  [RoleName.CUSTOMER]: [],
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async findProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { organization: true, role: true },
    });
    return this.toProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      include: { organization: true, role: true },
    });
    return this.toProfile(user);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Avatar must be an image file');
    }
    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('Avatar must be smaller than 5MB');
    }

    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ext = (file.originalname.split('.').pop() ?? 'png').toLowerCase();
    const key = `avatars/${userId}-${Date.now()}.${ext}`;
    const url = await this.storage.uploadBuffer(key, file.buffer, file.mimetype);

    const previousKey = current.avatarUrl ? this.storage.keyFromUrl(current.avatarUrl) : null;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
      include: { organization: true, role: true },
    });

    if (previousKey) {
      await this.storage.deleteObject(previousKey).catch(() => undefined);
    }
    return this.toProfile(user);
  }

  async listOrgMembers(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      role: u.role.name,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));
  }

  /**
   * Any staff member needs to know who else is staff to assign/transfer/escalate
   * tickets to — a narrower, less sensitive view than the full member directory,
   * which stays admin/manager-only.
   */
  async listAssignableAgents(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        status: UserStatus.ACTIVE,
        role: { name: { not: RoleName.CUSTOMER } },
      },
      include: { role: true },
      orderBy: { firstName: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      role: u.role.name,
    }));
  }

  async inviteUser(
    inviterId: string,
    organizationId: string,
    inviterRole: RoleName,
    dto: InviteUserDto,
  ) {
    if (!ALLOWED_INVITE_ROLES[inviterRole]?.includes(dto.role)) {
      throw new ForbiddenException(`Your role cannot invite a ${dto.role.toLowerCase()}`);
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const role = await this.prisma.role.findUnique({ where: { name: dto.role } });
    if (!role) throw new NotFoundException(`Role ${dto.role} is not seeded`);

    const [organization, inviter] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: inviterId } }),
    ]);
    const inviterName = `${inviter.firstName} ${inviter.lastName}`;

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: role.id,
        status: UserStatus.INVITED,
      },
    });

    const { token, tokenHash } = generateOpaqueToken();
    await this.prisma.inviteToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
    });
    await this.mail.sendInviteEmail(user.email, inviterName, organization.name, role.label, token);

    await this.audit.record({
      organizationId,
      actorUserId: inviterId,
      action: 'user.invited',
      entityType: 'User',
      entityId: user.id,
      metadata: { role: dto.role },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: role.name,
      status: user.status,
    };
  }

  async updateMember(
    actorId: string,
    actorRole: RoleName,
    organizationId: string,
    targetUserId: string,
    dto: UpdateMemberDto,
  ) {
    if (targetUserId === actorId) {
      throw new ForbiddenException('You cannot change your own role or status');
    }

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target || target.organizationId !== organizationId) {
      throw new NotFoundException('User not found in this organization');
    }

    if (dto.role && !ALLOWED_INVITE_ROLES[actorRole]?.includes(dto.role)) {
      throw new ForbiddenException(`Your role cannot grant the ${dto.role.toLowerCase()} role`);
    }
    const settableStatuses: UserStatus[] = [UserStatus.ACTIVE, UserStatus.SUSPENDED];
    if (dto.status && !settableStatuses.includes(dto.status)) {
      throw new BadRequestException('Status can only be set to ACTIVE or SUSPENDED here');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.role) {
      const role = await this.prisma.role.findUnique({ where: { name: dto.role } });
      if (!role) throw new NotFoundException(`Role ${dto.role} is not seeded`);
      data.role = { connect: { id: role.id } };
    }
    if (dto.status) data.status = dto.status;

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data,
      include: { role: true },
    });

    if (dto.status === UserStatus.SUSPENDED) {
      // Take effect immediately rather than waiting out the access token's ~15 min TTL.
      await this.prisma.session.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.audit.record({
      organizationId,
      actorUserId: actorId,
      action: 'user.updated',
      entityType: 'User',
      entityId: targetUserId,
      metadata: { role: dto.role, status: dto.status },
    });

    return {
      id: updated.id,
      email: updated.email,
      role: updated.role.name,
      status: updated.status,
    };
  }

  private toProfile(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    title: string | null;
    phone: string | null;
    timezone: string;
    status: UserStatus;
    lastLoginAt: Date | null;
    createdAt: Date;
    organizationId: string;
    role: { name: RoleName; label: string };
    organization: {
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      primaryColor: string;
      timezone: string;
    };
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      title: user.title,
      phone: user.phone,
      timezone: user.timezone,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      role: { name: user.role.name, label: user.role.label },
      organization: user.organization,
    };
  }
}
