import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { USER_TOKEN_COOKIE } from '@/lib/session-cookies'

function withNoIndex(response: NextResponse): NextResponse {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return response
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Tenant dashboard — must be signed in (OTP or self-host dev token)
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const token = request.cookies.get(USER_TOKEN_COOKIE)?.value?.trim()
    if (!token) {
      const login = new URL('/login', request.url)
      login.searchParams.set('next', pathname)
      return withNoIndex(NextResponse.redirect(login))
    }
    return withNoIndex(NextResponse.next())
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
  ],
}
