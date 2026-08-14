import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { AppConfig } from '../../config/configuration';
import type {
  AuthenticatedUser,
  JwtAccessPayload,
} from '../types/jwt-payload.type';

function extractFromCookie(req: Request): string | null {
  return req?.cookies?.sd_access ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: extractFromCookie,
      ignoreExpiration: false,
      secretOrKey: config.get('jwt', { infer: true }).accessSecret,
    });
  }

  // Runs on every authenticated request. We re-check the session row (not just
  // the token signature) so that revoking a session/suspending a user takes
  // effect immediately instead of waiting out the ~15 min access-token TTL.
  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
      select: { revokedAt: true, expiresAt: true, userId: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session is no longer valid');
    }
    if (session.userId !== payload.sub) {
      throw new UnauthorizedException('Session mismatch');
    }

    return {
      id: payload.sub,
      organizationId: payload.orgId,
      role: payload.role,
      permissions: payload.permissions,
      sessionId: payload.sessionId,
    };
  }
}
