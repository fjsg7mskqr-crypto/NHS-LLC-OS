import { withAuthenticatedRoute } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

type Status = 'ok' | 'warn' | 'alert'
type Check = { status: Status; detail: string }

async function checkSupabase(): Promise<Check> {
  try {
    const supabase = createServerClient()
    const t0 = Date.now()
    const { error } = await supabase.from('clients').select('id', { head: true, count: 'exact' }).limit(1)
    const ms = Date.now() - t0
    if (error) return { status: 'alert', detail: error.message.slice(0, 60) }
    if (ms > 1000) return { status: 'warn', detail: `${ms} ms (slow)` }
    return { status: 'ok', detail: `${ms} ms` }
  } catch (err) {
    return { status: 'alert', detail: err instanceof Error ? err.message.slice(0, 60) : 'unreachable' }
  }
}

async function checkSquare(): Promise<Check> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('square_invoices')
      .select('last_synced_at')
      .order('last_synced_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return { status: 'alert', detail: error.message.slice(0, 60) }
    if (!data?.last_synced_at) return { status: 'warn', detail: 'never synced' }
    const ageMs = Date.now() - new Date(data.last_synced_at).getTime()
    const ageHours = Math.round(ageMs / 3_600_000)
    if (ageHours > 48) return { status: 'alert', detail: `synced ${ageHours}h ago` }
    if (ageHours > 26) return { status: 'warn', detail: `synced ${ageHours}h ago` }
    if (ageHours < 1) {
      const ageMins = Math.max(1, Math.round(ageMs / 60_000))
      return { status: 'ok', detail: `synced ${ageMins}m ago` }
    }
    return { status: 'ok', detail: `synced ${ageHours}h ago` }
  } catch (err) {
    return { status: 'alert', detail: err instanceof Error ? err.message.slice(0, 60) : 'unreachable' }
  }
}

async function checkDiscord(): Promise<Check> {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) return { status: 'alert', detail: 'no token configured' }
  try {
    const t0 = Date.now()
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${token}` },
      signal: AbortSignal.timeout(3000),
    })
    const ms = Date.now() - t0
    if (!res.ok) return { status: 'alert', detail: `HTTP ${res.status}` }
    if (ms > 1500) return { status: 'warn', detail: `${ms} ms (slow)` }
    return { status: 'ok', detail: `${ms} ms` }
  } catch (err) {
    return { status: 'alert', detail: err instanceof Error ? err.message.slice(0, 60) : 'unreachable' }
  }
}

function checkVercel(): Check {
  const env = process.env.VERCEL_ENV
  if (!env) return { status: 'warn', detail: 'local dev' }
  return { status: 'ok', detail: env }
}

export const GET = withAuthenticatedRoute(async function GET() {
  const [supabase, square, discord] = await Promise.all([
    checkSupabase(),
    checkSquare(),
    checkDiscord(),
  ])
  const vercel = checkVercel()
  return Response.json({ supabase, square, discord, vercel })
})
