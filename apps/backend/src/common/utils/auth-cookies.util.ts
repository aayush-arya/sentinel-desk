import type { Response } from 'express';
import type { AuthTokenResult } from '../../auth/auth.service';

export interface CookieConfig {
  secure: boolean;
  domain: string;
}

const ACCESS_COOKIE = 'sd_access';
const REFRESH_COOKIE = 'sd_refresh';
const CSRF_COOKIE = 'sd_csrf';

export function setAuthCookies(res: Response, tokens: AuthTokenResult, cfg: CookieConfig) {
  const base = {
    httpOnly: true,
    secure: cfg.secure,
    sameSite: 'lax' as const,
  };

  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    path: '/',
    expires: tokens.accessTokenExpiresAt,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    path: '/api/auth',
    expires: tokens.refreshTokenExpiresAt,
  });
  // Readable by frontend JS by design — echoed back via the X-CSRF-Token header
  // on mutating requests (double-submit cookie pattern). Not a secret on its own.
  res.cookie(CSRF_COOKIE, tokens.csrfToken, {
    httpOnly: false,
    secure: cfg.secure,
    sameSite: 'lax',
    path: '/',
    expires: tokens.refreshTokenExpiresAt,
  });
}

export function clearAuthCookies(res: Response, cfg: CookieConfig) {
  res.clearCookie(ACCESS_COOKIE, { path: '/', secure: cfg.secure, sameSite: 'lax' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth', secure: cfg.secure, sameSite: 'lax' });
  res.clearCookie(CSRF_COOKIE, { path: '/', secure: cfg.secure, sameSite: 'lax' });
}
