import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_TOKEN_COOKIE, USER_TOKEN_COOKIE } from '@/lib/session-cookies';

function withNoIndex(response: NextResponse): NextResponse {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Tenant dashboard — must be signed in (managed OTP or self-host dev token)
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const token = request.cookies.get(USER_TOKEN_COOKIE)?.value?.trim();
    if (!token) {
      const login = new URL('/login', request.url);
      login.searchParams.set('next', pathname);
      return withNoIndex(NextResponse.redirect(login));
    }
    return withNoIndex(NextResponse.next());
  }

  // Operator admin — login form lives on /admin; block dashboard UI without admin session
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value?.trim();
    if (!token) {
      // No admin session: only allow the bare /admin route (OTP login UI), not subpaths
      if (pathname !== '/admin') {
        return withNoIndex(NextResponse.redirect(new URL('/admin', request.url)));
      }
    }
    return withNoIndex(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/admin', '/admin/:path*'],
};
