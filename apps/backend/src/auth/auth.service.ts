import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { RoleName, UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import type { AppConfig } from '../config/configuration';
import {
  comparePassword,
  generateOpaqueToken,
  hashPassword,
  hashToken,
} from '../common/utils/hash.util';
import { addDuration } from '../common/utils/duration.util';
import { slugify, randomSuffix } from '../common/utils/slug.util';
import { describeUserAgent } from '../common/utils/user-agent.util';
import type { SignupDto } from './dto/signup.dto';
import type { SignupCustomerDto } from './dto/signup-customer.dto';
import type { LoginDto } from './dto/login.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { ResendVerificationDto } from './dto/resend-verification.dto';
import type { AcceptInviteDto } from './dto/accept-invite.dto';
import type { JwtAccessPayload, JwtRefreshPayload } from './types/jwt-payload.type';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface AuthTokenResult {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  user: SafeUser;
}

export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: RoleName;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    primaryColor: string;
  };
}

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  async signup(dto: SignupDto, meta: RequestMeta): Promise<{ message: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const slugBase = slugify(dto.organizationName) || 'workspace';
    let slug = slugBase;
    // eslint-disable-next-line no-constant-condition
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${randomSuffix()}`;
    }

    const adminRole = await this.prisma.role.findUnique({ where: { name: RoleName.ADMIN } });
    if (!adminRole) {
      throw new Error('ADMIN role is not seeded — run `pnpm seed` before starting the app');
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: dto.organizationName, slug },
      });
      return tx.user.create({
        data: {
          organizationId: organization.id,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          roleId: adminRole.id,
          status: UserStatus.PENDING_VERIFICATION,
        },
      });
    });

    await this.issueEmailVerification(user.id, user.email, user.firstName);
    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'auth.signup',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ip,
    });

    return { message: 'Account created. Check your email to verify your address.' };
  }

  /** Self-service registration for end customers on a specific org's support portal. */
  async signupCustomer(dto: SignupCustomerDto, meta: RequestMeta): Promise<{ message: string }> {
    const organization = await this.prisma.organization.findUnique({
      where: { slug: dto.organizationSlug },
    });
    if (!organization) throw new NotFoundException('Unknown support portal');

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const customerRole = await this.prisma.role.findUnique({
      where: { name: RoleName.CUSTOMER },
    });
    if (!customerRole) {
      throw new Error('CUSTOMER role is not seeded — run `pnpm seed` before starting the app');
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        organizationId: organization.id,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: customerRole.id,
        status: UserStatus.PENDING_VERIFICATION,
      },
    });

    await this.issueEmailVerification(user.id, user.email, user.firstName);
    await this.audit.record({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'auth.signup_customer',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ip,
    });

    return { message: 'Account created. Check your email to verify your address.' };
  }

  /** Completes a staff/customer invite by setting the initial password and activating the account. */
  async acceptInvite(dto: AcceptInviteDto, meta: RequestMeta): Promise<AuthTokenResult> {
    const tokenHash = hashToken(dto.token);
    const record = await this.prisma.inviteToken.findUnique({ where: { tokenHash } });
    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invite link is invalid or has expired');
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.inviteToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      return tx.user.update({
        where: { id: record.userId },
        data: { passwordHash, status: UserStatus.ACTIVE },
        include: { organization: true, role: true },
      });
    });

    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'auth.invite_accepted',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ip,
    });

    return this.issueSession(user, meta, false);
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<AuthTokenResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organization: true, role: true },
    });

    // Constant-shape error for both "no such user" and "wrong password" to avoid
    // leaking which emails are registered.
    const invalidCredentials = () => new UnauthorizedException('Invalid email or password');

    if (!user || !user.passwordHash) throw invalidCredentials();
    const passwordOk = await comparePassword(dto.password, user.passwordHash);
    if (!passwordOk) throw invalidCredentials();

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new ForbiddenException('Please verify your email before logging in');
    }
    if (user.status === UserStatus.INVITED) {
      throw new ForbiddenException('Please accept your invite email before logging in');
    }
    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      throw new ForbiddenException('This account is no longer active');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const result = await this.issueSession(user, meta, !!dto.rememberMe);
    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ip,
    });
    return result;
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthTokenResult> {
    const jwtConfig = this.config.get('jwt', { infer: true });
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: jwtConfig.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.prisma.session.findUnique({ where: { id: payload.sessionId } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const providedHash = hashToken(refreshToken);
    if (providedHash !== session.refreshTokenHash) {
      // Token reuse: this refresh token was already rotated out, which means either
      // a stale client retried, or the token was stolen and used out of order.
      // Fail safe by killing the whole session rather than trusting either party.
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      this.logger.warn(`Refresh token reuse detected for session ${session.id}`);
      throw new UnauthorizedException('Refresh token has already been used');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: { organization: true, role: true },
    });
    if (!user || user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedException('Account is no longer active');
    }

    const rotated = await this.rotateSession(session.id, user, meta, session.isRememberMe);
    return rotated;
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAllOtherSessions(userId: string, currentSessionId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, id: { not: currentSessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });
    return sessions.map((s) => ({
      id: s.id,
      device: describeUserAgent(s.userAgent),
      ipAddress: s.ipAddress,
      isRememberMe: s.isRememberMe,
      lastUsedAt: s.lastUsedAt,
      createdAt: s.createdAt,
      isCurrent: s.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      throw new ForbiddenException('You can only revoke your own sessions');
    }
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Verification link is invalid or has expired');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { status: UserStatus.ACTIVE },
      }),
    ]);

    await this.audit.record({
      organizationId: (await this.prisma.user.findUniqueOrThrow({ where: { id: record.userId } }))
        .organizationId,
      actorUserId: record.userId,
      action: 'auth.email_verified',
      entityType: 'User',
      entityId: record.userId,
    });
  }

  async resendVerification(dto: ResendVerificationDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Always return the same message whether or not the account exists, to avoid
    // leaking registered emails to an unauthenticated caller.
    const genericResponse = {
      message: 'If an account with that email exists, a verification link has been sent.',
    };
    if (!user || user.status !== UserStatus.PENDING_VERIFICATION) return genericResponse;

    await this.issueEmailVerification(user.id, user.email, user.firstName);
    return genericResponse;
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const genericResponse = {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
    if (!user) return genericResponse;

    const { token, tokenHash } = generateOpaqueToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });
    await this.mail.sendPasswordResetEmail(user.email, user.firstName, token);
    return genericResponse;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Reset link is invalid or has expired');
    }

    const passwordHash = await hashPassword(dto.password);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      // Resetting a password invalidates every existing session — the whole point
      // of a reset is usually "I think someone else has access to my account".
      this.prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      organizationId: (await this.prisma.user.findUniqueOrThrow({ where: { id: record.userId } }))
        .organizationId,
      actorUserId: record.userId,
      action: 'auth.password_reset',
      entityType: 'User',
      entityId: record.userId,
    });
  }

  // ── internals ─────────────────────────────────────────────────────

  private async issueEmailVerification(userId: string, email: string, firstName: string) {
    const { token, tokenHash } = generateOpaqueToken();
    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS) },
    });
    await this.mail.sendVerificationEmail(email, firstName, token);
  }

  private async getPermissionsForRole(roleId: string): Promise<string[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rolePermissions.map((rp) => rp.permission.key);
  }

  /**
   * `expiresIn` on JwtSignOptions is typed against `ms`'s branded StringValue,
   * not a plain `string` — our config intentionally stores plain "15m"/"7d"
   * strings, so we cast at this single boundary rather than fight the type
   * through every call site.
   */
  private async signTokenPair(
    user: { id: string; organizationId: string; roleId: string; role: { name: RoleName } },
    sessionId: string,
    refreshTtl: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jwtConfig = this.config.get('jwt', { infer: true });
    const permissions = await this.getPermissionsForRole(user.roleId);
    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      orgId: user.organizationId,
      role: user.role.name,
      permissions,
      sessionId,
    };
    const refreshPayload: JwtRefreshPayload = { sub: user.id, sessionId };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: jwtConfig.accessSecret,
      expiresIn: jwtConfig.accessExpiresIn as JwtSignOptions['expiresIn'],
    });
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: jwtConfig.refreshSecret,
      expiresIn: refreshTtl as JwtSignOptions['expiresIn'],
    });
    return { accessToken, refreshToken };
  }

  private async issueSession(
    user: { id: string; organizationId: string; roleId: string; role: { name: RoleName }; organization: SafeUser['organization']; email: string; firstName: string; lastName: string; avatarUrl: string | null },
    meta: RequestMeta,
    rememberMe: boolean,
  ): Promise<AuthTokenResult> {
    const jwtConfig = this.config.get('jwt', { infer: true });
    const refreshTtl = rememberMe
      ? jwtConfig.refreshExpiresInRememberMe
      : jwtConfig.refreshExpiresIn;
    const now = new Date();
    const refreshTokenExpiresAt = addDuration(now, refreshTtl);

    // Refresh token signed with a placeholder sessionId first is not possible (chicken/egg),
    // so we create the session row with a temporary hash, then update it with the real
    // token hash once signed — both writes happen before anything is returned to the caller.
    const placeholder = randomBytes(16).toString('hex');
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: placeholder,
        userAgent: meta.userAgent,
        ipAddress: meta.ip,
        isRememberMe: rememberMe,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    const { accessToken, refreshToken } = await this.signTokenPair(user, session.id, refreshTtl);

    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    return {
      accessToken,
      refreshToken,
      csrfToken: randomBytes(24).toString('base64url'),
      accessTokenExpiresAt: addDuration(now, jwtConfig.accessExpiresIn),
      refreshTokenExpiresAt,
      user: this.toSafeUser(user),
    };
  }

  private async rotateSession(
    sessionId: string,
    user: { id: string; organizationId: string; roleId: string; role: { name: RoleName }; organization: SafeUser['organization']; email: string; firstName: string; lastName: string; avatarUrl: string | null },
    meta: RequestMeta,
    rememberMe: boolean,
  ): Promise<AuthTokenResult> {
    const jwtConfig = this.config.get('jwt', { infer: true });
    const refreshTtl = rememberMe
      ? jwtConfig.refreshExpiresInRememberMe
      : jwtConfig.refreshExpiresIn;
    const now = new Date();
    const refreshTokenExpiresAt = addDuration(now, refreshTtl);

    const { accessToken, refreshToken } = await this.signTokenPair(user, sessionId, refreshTtl);

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: hashToken(refreshToken),
        lastUsedAt: now,
        expiresAt: refreshTokenExpiresAt,
        userAgent: meta.userAgent ?? undefined,
        ipAddress: meta.ip ?? undefined,
      },
    });

    return {
      accessToken,
      refreshToken,
      csrfToken: randomBytes(24).toString('base64url'),
      accessTokenExpiresAt: addDuration(now, jwtConfig.accessExpiresIn),
      refreshTokenExpiresAt,
      user: this.toSafeUser(user),
    };
  }

  private toSafeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    organizationId: string;
    role: { name: RoleName };
    organization: SafeUser['organization'];
  }): SafeUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role.name,
      organizationId: user.organizationId,
      organization: user.organization,
    };
  }
}
