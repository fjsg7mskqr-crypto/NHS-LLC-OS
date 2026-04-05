import { withAuthenticatedRoute } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { syncSquareInvoices } from '@/lib/domain/square'

export const POST = withAuthenticatedRoute(async function POST() {
  const supabase = createServerClient()

  try {
    return Response.json(await syncSquareInvoices(supabase))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Square sync failed: ${msg}` }, { status: 500 })
  }
})
