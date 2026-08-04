// Shared API contract types for SentinelDesk. Hand-kept in sync with the
// NestJS DTOs/serializers in apps/backend — this package has no runtime
// dependency on the backend, it just documents the wire shape both sides agree on.

export type RoleName = 'CUSTOMER' | 'AGENT' | 'SENIOR_AGENT' | 'MANAGER' | 'ADMIN';

export type UserStatus = 'PENDING_VERIFICATION' | 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logoUrl: string | null;
  primaryColor: string;
  timezone: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: RoleName;
  organizationId: string;
  organization: OrganizationSummary;
}

export interface LoginResponse {
  user: AuthUser;
  csrfToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  title: string | null;
  phone: string | null;
  timezone: string;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  role: { name: RoleName; label: string };
  organization: OrganizationSummary;
}

export interface OrgMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: RoleName;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  device: string;
  ipAddress: string | null;
  isRememberMe: boolean;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

export const ROLE_LABELS: Record<RoleName, string> = {
  CUSTOMER: 'Customer',
  AGENT: 'Support Agent',
  SENIOR_AGENT: 'Senior Agent',
  MANAGER: 'Manager',
  ADMIN: 'Admin',
};
