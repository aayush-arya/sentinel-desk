import { createHash, randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import type { CreateApiKeyDto } from './dto/create-api-key.dto';

const KEY_PREFIX = 'sk_live_';

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: AuthenticatedUser) {
    return this.prisma.apiKey.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        createdAt: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // The full key is only ever returned here, at creation - only its hash is stored,
  // the same way passwords are - so there is no way to recover it later, by design.
  async create(user: AuthenticatedUser, dto: CreateApiKeyDto) {
    const rawKey = `${KEY_PREFIX}${randomBytes(24).toString('hex')}`;
    const record = await this.prisma.apiKey.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        name: dto.name,
        keyHash: hashKey(rawKey),
        keyPrefix: rawKey.slice(0, KEY_PREFIX.length + 8),
      },
    });
    return {
      id: record.id,
      name: record.name,
      key: rawKey,
      createdAt: record.createdAt,
    };
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('API key not found');
    await this.prisma.apiKey.delete({ where: { id } });
  }

  /** Used by JwtAuthGuard as an alternative to cookie auth for the public API surface. */
  async validateKey(rawKey: string): Promise<AuthenticatedUser | null> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash: hashKey(rawKey) },
      include: { createdBy: { include: { role: true } } },
    });
    if (!apiKey) return null;

    // Fire-and-forget - a failed "last used" bump must never block the actual request.
    void this.prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    // Mirrors auth.service.ts's own permission lookup at login - an API key acts with
    // exactly the permissions of the admin who created it, not a separate scope model.
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: apiKey.createdBy.roleId },
      include: { permission: true },
    });

    return {
      id: apiKey.createdBy.id,
      organizationId: apiKey.organizationId,
      role: apiKey.createdBy.role.name,
      permissions: rolePermissions.map((rp) => rp.permission.key),
      sessionId: `api-key:${apiKey.id}`,
    };
  }
}
