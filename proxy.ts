import { NextResponse, type NextRequest } from 'next/server'
import {
  applySessionCookies,
  clearSessionCookies,
  requireAuthenticatedRequest,
} from '@/lib/auth'

// ---------------------------------------------------------------------------
// CORS — restrict API access to the app's own origin
// ---------------------------------------------------------------------------

function getAllowedOrigins() {
  if (process.env.NODE_ENV === 'production') {
    return [
      'https://app.nhs-llc.com',
      process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : '',
    ].filter(Boolean)
  }
  return ['http://localhost:3000', 'http://localhost:3001']
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) return true // same-origin requests have no Origin header
  return getAllowedOrigins().some(
    (allowed) => origin === allowed || origin.endsWith('.vercel.app')
  )
}

function corsHeaders(origin: string | null) {
  const headers = new Headers()
  if (origin && isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
  }
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Access-Control-Max-Age', '86400')
  return headers
}

// ---------------------------------------------------------------------------
// Rate limiting — simple in-memory sliding window per IP
// Per-instance only (Vercel functions are short-lived). Catches bursts.
// For global rate limiting, upgrade to Vercel KV or Upstash.
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 100

const ipHits = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipHits.get(ip)

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

let lastCleanup = Date.now()
function cleanupIfNeeded() {
  const now = Date.now()
  if (now - lastCleanup < RATE_LIMIT_WINDOW_MS) return
  lastCleanup = now
  for (const [ip, entry] of ipHits) {
    if (now > entry.resetAt) ipHits.delete(ip)
  }
}

// ---------------------------------------------------------------------------
// Proxy entry point
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')

  // ── API routes: CORS + rate limiting ──────────────────────────────────

  if (pathname.startsWith('/api/')) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
    }

    // Block disallowed cross-origin requests
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
    }

    // Rate limit
    cleanupIfNeeded()
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // Attach CORS headers to API responses
    const response = NextResponse.next()
    const cors = corsHeaders(origin)
    cors.forEach((value, key) => {
      response.headers.set(key, value)
    })
    return response
  }

  // ── Page routes: authentication ───────────────────────────────────────

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
  matcher: ['/', '/dashboard/:path*', '/login', '/api/:path*'],
}
