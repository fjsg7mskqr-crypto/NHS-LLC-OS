import { withAuthenticatedRoute } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { getStatsSnapshot } from '@/lib/domain/reports'

export const GET = withAuthenticatedRoute(async function GET() {
  const supabase = createServerClient()
  try {
    return Response.json(await getStatsSnapshot(supabase))
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to load stats' },
      { status: 500 }
    )
  }
})
