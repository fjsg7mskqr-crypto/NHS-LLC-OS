import { createClient, type Session, type User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

const ACCESS_TOKEN_COOKIE = 'nhs-access-token'
const REFRESH_TOKEN_COOKIE = 'nhs-refresh-token'
const AUTH_STORAGE_KEY = 'nhs-auth'
const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 180

type CookieStorage = {
  isServer: true
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

type AuthenticatedRequest =
  | { user: User; refreshedSession?: Session }
  | { response: Response }

function getAllowedEmails() {
  return (process.env.AUTHORIZED_EMAILS ?? process.env.AUTHORIZED_GOOGLE_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function getAllowedGitHubLogins() {
  return (process.env.AUTHORIZED_GITHUB_LOGINS ?? '')
    .split(',')
    .map((login) => login.trim().toLowerCase())
    .filter(Boolean)
}

export function isAuthorizedUser(user: User) {
  const allowedEmails = getAllowedEmails()
  const allowedGitHubLogins = getAllowedGitHubLogins()
  const githubLogin = user.user_metadata?.user_name ?? user.user_metadata?.preferred_username

  if (allowedGitHubLogins.length > 0) {
    return (
      typeof githubLogin === 'string' &&
      allowedGitHubLogins.includes(githubLogin.toLowerCase())
    )
  }

  if (allowedEmails.length === 0) {
    return true
  }

  return !!user.email && allowedEmails.includes(user.email.toLowerCase())
}

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  return url
}

function getSupabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured')
  return key
}

function getAccessToken(request: NextRequest) {
  return request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
}

function getRefreshToken(request: NextRequest) {
  return request.cookies.get(REFRESH_TOKEN_COOKIE)?.value
}

function getCookieOptions(maxAge: number) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge,
  }
}

function createPkceCookieStorage(request: NextRequest): CookieStorage {
  return {
    isServer: true,
    async getItem(key) {
      return request.cookies.get(key)?.value ?? null
    },
    async setItem(key, value) {
      const cookieStore = await cookies()
      cookieStore.set(key, value, getCookieOptions(60 * 10))
    },
    async removeItem(key) {
      const cookieStore = await cookies()
      cookieStore.delete(key)
    },
  }
}

function createAuthClient(storage?: CookieStorage) {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
      persistSession: true,
      storageKey: AUTH_STORAGE_KEY,
      storage: storage ?? {
        isServer: true,
        async getItem() {
          return null
        },
        async setItem() {},
        async removeItem() {},
      },
    },
  })
}

export function sanitizeNextPath(nextPath: string | null | undefined) {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/dashboard'
  }

  return nextPath
}

export async function createGitHubAuthUrl(request: NextRequest, nextPath?: string | null) {
  const supabase = createAuthClient(createPkceCookieStorage(request))
  const redirectTo = new URL('/auth/callback', request.nextUrl.origin)
  redirectTo.searchParams.set('next', sanitizeNextPath(nextPath))

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: redirectTo.toString(),
      scopes: 'user:email',
      skipBrowserRedirect: true,
    },
  })

  if (error) {
    throw error
  }

  if (!data.url) {
    throw new Error('Supabase did not return an OAuth URL')
  }

  return data.url
}

export async function exchangeCodeForSession(request: NextRequest, code: string) {
  const supabase = createAuthClient(createPkceCookieStorage(request))
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    throw error
  }

  if (!data.session) {
    throw new Error('Supabase did not return a session')
  }

  return data.session
}

export function applySessionCookies(response: Response, session: Session) {
  const accessMaxAge = Math.max((session.expires_at ?? 0) - Math.floor(Date.now() / 1000), 60)

  response.headers.append(
    'Set-Cookie',
    `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(session.access_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${accessMaxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )
  response.headers.append(
    'Set-Cookie',
    `${REFRESH_TOKEN_COOKIE}=${encodeURIComponent(session.refresh_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${REFRESH_COOKIE_MAX_AGE}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )
}

export function clearSessionCookies(response: Response) {
  response.headers.append(
    'Set-Cookie',
    `${ACCESS_TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )
  response.headers.append(
    'Set-Cookie',
    `${REFRESH_TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )
}

export async function getAuthenticatedUserFromCookies() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value

  if (!accessToken) {
    return null
  }

  const supabase = createAuthClient()
  const { data, error } = await supabase.auth.getUser(accessToken)

  if (error) {
    return null
  }

  if (!isAuthorizedUser(data.user)) {
    return null
  }

  return data.user
}

export async function requireAuthenticatedRequest(
  request: NextRequest
): Promise<AuthenticatedRequest> {
  const accessToken = getAccessToken(request)
  const refreshToken = getRefreshToken(request)

  if (accessToken) {
    const supabase = createAuthClient()
    const { data, error } = await supabase.auth.getUser(accessToken)

    if (!error && data.user) {
      if (!isAuthorizedUser(data.user)) {
        const response = Response.json({ error: 'Access denied' }, { status: 403 })
        clearSessionCookies(response)
        return { response }
      }

      return { user: data.user }
    }
  }

  if (!refreshToken) {
    return {
      response: Response.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  const supabase = createAuthClient()
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  })

  if (error || !data.session || !data.user) {
    const response = Response.json({ error: 'Authentication required' }, { status: 401 })
    clearSessionCookies(response)
    return { response }
  }

  if (!isAuthorizedUser(data.user)) {
    const response = Response.json({ error: 'Access denied' }, { status: 403 })
    clearSessionCookies(response)
    return { response }
  }

  return { user: data.user, refreshedSession: data.session }
}

export function withAuthenticatedRoute(
  handler: (request: NextRequest) => Promise<Response>
) {
  return async function authenticatedRoute(request: NextRequest) {
    const auth = await requireAuthenticatedRequest(request)

    if ('response' in auth) {
      return auth.response
    }

    const response = await handler(request)

    if (auth.refreshedSession) {
      applySessionCookies(response, auth.refreshedSession)
    }

    return response
  }
}
