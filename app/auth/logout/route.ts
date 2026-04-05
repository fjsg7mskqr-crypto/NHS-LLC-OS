import { NextResponse, type NextRequest } from 'next/server'
import { clearSessionCookies } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url))
  clearSessionCookies(response)
  return response
}
