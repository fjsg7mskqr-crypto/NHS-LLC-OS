import { type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const status = request.nextUrl.searchParams.get('status')

  let query = supabase
    .from('jobs')
    .select(`*, client:clients(*), property:properties(*)`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      client_id: body.client_id,
      property_id: body.property_id || null,
      title: body.title,
      description: body.description || null,
      status: body.status || 'scheduled',
      hourly_rate: body.hourly_rate ? Number(body.hourly_rate) : null,
      is_recurring: body.is_recurring || false,
      recurrence: body.recurrence || null,
      scheduled_date: body.scheduled_date || null,
      notes: body.notes || null,
    })
    .select(`*, client:clients(*), property:properties(*)`)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
