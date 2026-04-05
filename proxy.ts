import { NextResponse, type NextRequest } from 'next/server'
import {
  applySessionCookies,
  clearSessionCookies,
  requireAuthenticatedRequest,
} from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/login') {
    const auth = await requireAuthenticatedRequest(request)

    if ('response' in auth) {
      return NextResponse.next()
    }

    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    if (auth.refreshedSession) {
      applySessionCookies(response, auth.refreshedSession)
    }
    return response
  }

  if (pathname === '/' || pathname.startsWith('/dashboard')) {
    const auth = await requireAuthenticatedRequest(request)

    if ('response' in auth) {
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      const response = NextResponse.redirect(loginUrl)
      clearSessionCookies(response)
      return response
    }

    const response =
      pathname === '/'
        ? NextResponse.redirect(new URL('/dashboard', request.url))
        : NextResponse.next()

    if (auth.refreshedSession) {
      applySessionCookies(response, auth.refreshedSession)
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login'],
}
