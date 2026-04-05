import { NextResponse, type NextRequest } from 'next/server'
import {
  applySessionCookies,
  exchangeCodeForSession,
  isAuthorizedUser,
  sanitizeNextPath,
  clearSessionCookies,
} from '@/lib/auth'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'))

  if (!code) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'Missing OAuth code.')
    loginUrl.searchParams.set('next', nextPath)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const session = await exchangeCodeForSession(request, code)

    if (!isAuthorizedUser(session.user)) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'This Google account is not authorized.')
      loginUrl.searchParams.set('next', nextPath)
      const response = NextResponse.redirect(loginUrl)
      clearSessionCookies(response)
      return response
    }

    const response = NextResponse.redirect(new URL(nextPath, request.url))
    applySessionCookies(response, session)
    return response
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to complete Google sign-in.'
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', message)
    loginUrl.searchParams.set('next', nextPath)
    return NextResponse.redirect(loginUrl)
  }
}
