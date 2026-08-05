import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';

export function isStaff(user: AuthenticatedUser): boolean {
  return user.role !== 'CUSTOMER';
}
