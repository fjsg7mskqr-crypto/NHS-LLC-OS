import { type NextRequest } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { createTimeEntry } from '@/lib/domain/time'

export const POST = withAuthenticatedRoute(async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  try {
    const data = await createTimeEntry(supabase, {
      job_id: body.job_id || null,
      client_id: body.client_id || null,
      property_id: body.property_id || null,
      category: body.category,
      start_time: body.start_time,
      end_time: body.end_time,
      billable: body.billable ?? false,
      hourly_rate: body.hourly_rate ? Number(body.hourly_rate) : null,
      notes: body.notes || null,
      source: body.source || 'dashboard',
    })

    return Response.json(data, { status: 201 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create time entry' },
      { status: 500 }
    )
  }
})
