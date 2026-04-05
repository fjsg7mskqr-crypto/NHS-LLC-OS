import { NextResponse, type NextRequest } from 'next/server'
import { createGoogleAuthUrl, sanitizeNextPath } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'))

  try {
    const url = await createGoogleAuthUrl(request, nextPath)
    return NextResponse.redirect(url)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to start Google sign-in.'
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', message)
    loginUrl.searchParams.set('next', nextPath)
    return NextResponse.redirect(loginUrl)
  }
}
