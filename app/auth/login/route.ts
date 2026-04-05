import { NextResponse, type NextRequest } from 'next/server'
import { createGitHubAuthUrl, sanitizeNextPath } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'))

  try {
    const url = await createGitHubAuthUrl(request, nextPath)
    return NextResponse.redirect(url)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to start GitHub sign-in.'
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', message)
    loginUrl.searchParams.set('next', nextPath)
    return NextResponse.redirect(loginUrl)
  }
}
