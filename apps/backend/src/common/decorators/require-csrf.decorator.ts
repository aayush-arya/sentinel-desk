import { SetMetadata } from '@nestjs/common';

export const REQUIRE_CSRF_KEY = 'requireCsrf';

/**
 * Opt-in double-submit CSRF check for cookie-authenticated mutating routes.
 * Not needed on token-authenticated routes (signup/login/reset/accept-invite)
 * since those have no ambient session cookie for an attacker to ride.
 */
export const RequireCsrf = () => SetMetadata(REQUIRE_CSRF_KEY, true);
