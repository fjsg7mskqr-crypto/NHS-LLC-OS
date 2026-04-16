import { type NextRequest } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import {
  getDebrief,
  getDebriefsInRange,
  upsertDebrief,
  getDebriefContext,
} from '@/lib/domain/debriefs'

export const GET = withAuthenticatedRoute(async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const params = request.nextUrl.searchParams
  const date = params.get('date')
  const startDate = params.get('start_date')
  const endDate = params.get('end_date')
  const includeContext = params.get('include_context') === 'true'

  try {
    if (startDate && endDate) {
      const data = await getDebriefsInRange(supabase, startDate, endDate)
      return Response.json(data)
    }

    const debrief = await getDebrief(supabase, date || undefined)
    if (includeContext) {
      const context = await getDebriefContext(supabase, date || undefined)
      return Response.json({ debrief, context })
    }
    return Response.json(debrief)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to load debrief' },
      { status: 500 }
    )
  }
})

export const POST = withAuthenticatedRoute(async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  if (!body?.date) {
    return Response.json({ error: 'date is required' }, { status: 400 })
  }

  try {
    const data = await upsertDebrief(supabase, {
      date: body.date,
      summary: body.summary ?? null,
      wins: body.wins ?? null,
      blockers: body.blockers ?? null,
      followups: body.followups ?? null,
      append: body.append === true,
    })
    return Response.json(data)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to save debrief' },
      { status: 500 }
    )
  }
})
