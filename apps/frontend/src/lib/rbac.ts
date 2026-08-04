import type { RoleName } from '@sentinel-desk/types';

export const STAFF_MANAGEMENT_ROLES: RoleName[] = ['ADMIN', 'MANAGER'];

export function canManageTeam(role: RoleName): boolean {
  return STAFF_MANAGEMENT_ROLES.includes(role);
}

// Mirrors ALLOWED_INVITE_ROLES in apps/backend/src/users/users.service.ts — used only
// to avoid offering choices the server would reject; the server remains the source of truth.
const ALLOWED_GRANTABLE_ROLES: Record<RoleName, RoleName[]> = {
  ADMIN: ['CUSTOMER', 'AGENT', 'SENIOR_AGENT', 'MANAGER', 'ADMIN'],
  MANAGER: ['CUSTOMER', 'AGENT', 'SENIOR_AGENT'],
  SENIOR_AGENT: [],
  AGENT: [],
  CUSTOMER: [],
};

export function grantableRoles(actorRole: RoleName): RoleName[] {
  return ALLOWED_GRANTABLE_ROLES[actorRole] ?? [];
}
