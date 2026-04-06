import { type NextRequest } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAuthenticatedRoute(async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const params = request.nextUrl.searchParams
  const date = params.get('date')
  const weekStart = params.get('week_start')
  const jobId = params.get('job_id')
  const startDate = params.get('start_date')
  const endDate = params.get('end_date')
  const clientId = params.get('client_id')
  const propertyId = params.get('property_id')
  const category = params.get('category')
  const billableOnly = params.get('billable_only')

  let query = supabase
    .from('time_entries')
    .select(`*, job:jobs(id, title), client:clients(id, name), property:properties(id, name)`)
    .order('start_time', { ascending: true })

  if (date) {
    query = query
      .gte('start_time', `${date}T00:00:00`)
      .lt('start_time', `${date}T23:59:59`)
  } else if (weekStart) {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 7)
    const endStr = end.toISOString().split('T')[0]
    query = query
      .gte('start_time', `${weekStart}T00:00:00`)
      .lt('start_time', `${endStr}T00:00:00`)
  } else if (startDate && endDate) {
    query = query
      .gte('start_time', `${startDate}T00:00:00`)
      .lte('start_time', `${endDate}T23:59:59`)
  }

  if (jobId) query = query.eq('job_id', jobId)
  if (clientId) query = query.eq('client_id', clientId)
  if (propertyId) query = query.eq('property_id', propertyId)
  if (category) query = query.eq('category', category)
  if (billableOnly === 'true') query = query.eq('billable', true)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
})

export const PATCH = withAuthenticatedRoute(async function PATCH(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  // Recalculate duration and billable amount if times changed
  if (updates.start_time && updates.end_time) {
    const startTime = new Date(updates.start_time)
    const endTime = new Date(updates.end_time)
    updates.duration_minutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)
    if (updates.billable && updates.hourly_rate) {
      updates.billable_amount = Math.round((updates.duration_minutes / 60) * updates.hourly_rate * 100) / 100
    } else {
      updates.billable_amount = null
    }
  }

  const { data, error } = await supabase
    .from('time_entries')
    .update(updates)
    .eq('id', id)
    .select(`*, job:jobs(id, title), client:clients(id, name), property:properties(id, name)`)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
})

export const DELETE = withAuthenticatedRoute(async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const id = request.nextUrl.searchParams.get('id')

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
})
