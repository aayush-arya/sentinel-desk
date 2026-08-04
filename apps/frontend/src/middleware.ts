import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/accept-invite'];

/**
 * Cookie-presence-only check for UX redirects (avoid flashing a login form at an
 * authenticated user, or a dashboard shell at a logged-out one). This is not the
 * security boundary — every API request is still independently authorized by the
 * backend's guards regardless of what this middleware decides.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has('sd_access');
  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));
  const isProtectedPage = pathname.startsWith('/dashboard');

  if (isProtectedPage && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
