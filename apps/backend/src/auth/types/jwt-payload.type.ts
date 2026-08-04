import { RoleName } from '@prisma/client';

export interface JwtAccessPayload {
  sub: string;
  orgId: string;
  role: RoleName;
  permissions: string[];
  sessionId: string;
}

export interface JwtRefreshPayload {
  sub: string;
  sessionId: string;
}

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  role: RoleName;
  permissions: string[];
  sessionId: string;
}
