import { type NextRequest } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

const VALID_STATUSES = ['scheduled', 'in_progress', 'active', 'complete', 'cancelled']

export const GET = withAuthenticatedRoute(async function GET(request: NextRequest) {
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
})

export const POST = withAuthenticatedRoute(async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    return Response.json({ error: 'title is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      client_id: body.client_id,
      property_id: body.property_id || null,
      title: body.title.trim(),
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
})

export const PATCH = withAuthenticatedRoute(async function PATCH(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  if (updates.title !== undefined) {
    if (typeof updates.title !== 'string' || !updates.title.trim()) {
      return Response.json({ error: 'title cannot be empty' }, { status: 400 })
    }
    updates.title = updates.title.trim()
  }
  if (updates.status && !VALID_STATUSES.includes(updates.status)) {
    return Response.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select(`*, client:clients(*), property:properties(*)`)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
})

export const DELETE = withAuthenticatedRoute(async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const id = request.nextUrl.searchParams.get('id')

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('jobs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
})
