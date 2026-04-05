import { type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const VALID_PRIORITIES = ['high', 'medium', 'low']

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const limit = request.nextUrl.searchParams.get('limit')
  const showCompleted = request.nextUrl.searchParams.get('show_completed')

  let query = supabase
    .from('tasks')
    .select(`*, client:clients(id, name), job:jobs(id, title), property:properties(id, name)`)
    .is('deleted_at', null)
    .order('priority')
    .order('due_date', { ascending: true, nullsFirst: false })

  if (showCompleted !== 'true') {
    query = query.eq('completed', false)
  }

  if (limit) query = query.limit(Number(limit))

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    return Response.json({ error: 'title is required' }, { status: 400 })
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return Response.json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: body.title.trim(),
      priority: body.priority || 'medium',
      due_date: body.due_date || null,
      client_id: body.client_id || null,
      property_id: body.property_id || null,
      job_id: body.job_id || null,
      completed: false,
    })
    .select(`*, client:clients(id, name), job:jobs(id, title)`)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  if (updates.title !== undefined && (!updates.title || !String(updates.title).trim())) {
    return Response.json({ error: 'title cannot be empty' }, { status: 400 })
  }
  if (updates.title) updates.title = String(updates.title).trim()

  // Handle completion
  if (updates.completed === true && !updates.completed_at) {
    updates.completed_at = new Date().toISOString()
  }
  if (updates.completed === false) {
    updates.completed_at = null
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select(`*, client:clients(id, name), job:jobs(id, title)`)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const id = request.nextUrl.searchParams.get('id')

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
