import * as Sentry from '@sentry/nextjs'
import { type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { syncSquareInvoices } from '@/lib/domain/square'
import { captureError } from '@/lib/logger'

const SQUARE_SYNC_MONITOR_SLUG = 'square-sync'

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  try {
    const result = await Sentry.withMonitor(
      SQUARE_SYNC_MONITOR_SLUG,
      async () => syncSquareInvoices(supabase),
      {
        schedule: { type: 'crontab', value: '0 11 * * *' },
        timezone: 'America/Detroit',
        maxRuntime: 30,
      }
    )
    return Response.json(result)
  } catch (err) {
    captureError(err, { route: '/api/cron/square-sync', method: 'GET' })
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
