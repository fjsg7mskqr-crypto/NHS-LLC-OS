import { type NextRequest } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

export const POST = withAuthenticatedRoute(async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  const startTime = new Date(body.start_time)
  const endTime = new Date(body.end_time)
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

  const hourlyRate = body.hourly_rate ? Number(body.hourly_rate) : null
  const billableAmount = body.billable && hourlyRate
    ? Math.round((durationMinutes / 60) * hourlyRate * 100) / 100
    : null

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      job_id: body.job_id || null,
      client_id: body.client_id || null,
      property_id: body.property_id || null,
      category: body.category,
      start_time: body.start_time,
      end_time: body.end_time,
      duration_minutes: durationMinutes,
      billable: body.billable ?? false,
      hourly_rate: hourlyRate,
      billable_amount: billableAmount,
      notes: body.notes || null,
      source: body.source || 'dashboard',
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
})
