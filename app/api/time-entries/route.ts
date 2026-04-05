import { type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
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
    // Entries for a specific day (local date)
    query = query
      .gte('start_time', `${date}T00:00:00`)
      .lt('start_time', `${date}T23:59:59`)
  } else if (weekStart) {
    // Entries for a full week starting on weekStart
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 7)
    const endStr = end.toISOString().split('T')[0]
    query = query
      .gte('start_time', `${weekStart}T00:00:00`)
      .lt('start_time', `${endStr}T00:00:00`)
  } else if (startDate && endDate) {
    // Arbitrary date range for export
    query = query
      .gte('start_time', `${startDate}T00:00:00`)
      .lt('start_time', `${endDate}T23:59:59`)
  }

  if (jobId) query = query.eq('job_id', jobId)
  if (clientId) query = query.eq('client_id', clientId)
  if (propertyId) query = query.eq('property_id', propertyId)
  if (category) query = query.eq('category', category)
  if (billableOnly === 'true') query = query.eq('billable', true)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
