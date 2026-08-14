import type { Response } from 'express';
import type { AuthTokenResult } from '../../auth/auth.service';

export interface CookieConfig {
  secure: boolean;
  domain: string;
}

const ACCESS_COOKIE = 'sd_access';
const REFRESH_COOKIE = 'sd_refresh';
const CSRF_COOKIE = 'sd_csrf';

// Lax works in local dev only because localhost:3000/localhost:4000 share a site
// (SameSite is scoped to the registrable domain, not the port). A real deployment puts
// the frontend and backend on genuinely different sites, where Lax cookies are never
// sent on cross-site API calls — silently breaking auth. None requires Secure, so the
// two are tied together: real HTTPS deployments get None, anything else stays Lax.
function sameSiteFor(cfg: CookieConfig): 'lax' | 'none' {
  return cfg.secure ? 'none' : 'lax';
}

export function setAuthCookies(
  res: Response,
  tokens: AuthTokenResult,
  cfg: CookieConfig,
) {
  const base = {
    httpOnly: true,
    secure: cfg.secure,
    sameSite: sameSiteFor(cfg),
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
    sameSite: sameSiteFor(cfg),
    path: '/',
    expires: tokens.refreshTokenExpiresAt,
  });
}

export function clearAuthCookies(res: Response, cfg: CookieConfig) {
  const sameSite = sameSiteFor(cfg);
  res.clearCookie(ACCESS_COOKIE, { path: '/', secure: cfg.secure, sameSite });
  res.clearCookie(REFRESH_COOKIE, {
    path: '/api/auth',
    secure: cfg.secure,
    sameSite,
  });
  res.clearCookie(CSRF_COOKIE, { path: '/', secure: cfg.secure, sameSite });
}
