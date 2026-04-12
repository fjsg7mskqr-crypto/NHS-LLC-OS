import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// CORS — restrict API access to the app's own origin
// ---------------------------------------------------------------------------

function getAllowedOrigins() {
  // In production, lock to the real domain. In dev, allow localhost.
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
// Vercel edge functions are short-lived so this is per-instance, not global.
// It catches bursts; for global rate limiting, use Vercel KV or Upstash.
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 100 // 100 requests per minute per IP

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

// Periodic cleanup so the map doesn't grow unbounded
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
// Middleware entry point
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')

  // Handle CORS preflight for API routes
  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
  }

  // Block disallowed cross-origin API requests
  if (pathname.startsWith('/api/') && !isAllowedOrigin(origin)) {
    return NextResponse.json(
      { error: 'Origin not allowed' },
      { status: 403 }
    )
  }

  // Rate limit API routes
  if (pathname.startsWith('/api/')) {
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
  }

  // Continue — attach CORS headers to actual API responses
  const response = NextResponse.next()
  if (pathname.startsWith('/api/')) {
    const cors = corsHeaders(origin)
    cors.forEach((value, key) => {
      response.headers.set(key, value)
    })
  }

  return response
}

export const config = {
  matcher: ['/api/:path*'],
}
