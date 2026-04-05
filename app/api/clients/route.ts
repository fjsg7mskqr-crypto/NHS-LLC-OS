import { type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const id = request.nextUrl.searchParams.get('id')

  if (id) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .is('deleted_at', null)
    .order('name')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }
  if (body.default_hourly_rate !== undefined && (typeof body.default_hourly_rate !== 'number' || body.default_hourly_rate < 0)) {
    return Response.json({ error: 'default_hourly_rate must be a non-negative number' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: body.name.trim(),
      email: body.email || null,
      phone: body.phone || null,
      default_hourly_rate: body.default_hourly_rate ?? 0,
      notes: body.notes || null,
    })
    .select('*')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  if (updates.name !== undefined) {
    if (typeof updates.name !== 'string' || !updates.name.trim()) {
      return Response.json({ error: 'name cannot be empty' }, { status: 400 })
    }
    updates.name = updates.name.trim()
  }
  if (updates.default_hourly_rate !== undefined && (typeof updates.default_hourly_rate !== 'number' || updates.default_hourly_rate < 0)) {
    return Response.json({ error: 'default_hourly_rate must be a non-negative number' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const id = request.nextUrl.searchParams.get('id')

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  const now = new Date().toISOString()

  // Cascade soft-delete: archive the client's jobs and tasks too
  const [clientRes, jobsRes, tasksRes] = await Promise.all([
    supabase.from('clients').update({ deleted_at: now }).eq('id', id),
    supabase.from('jobs').update({ deleted_at: now }).eq('client_id', id).is('deleted_at', null),
    supabase.from('tasks').update({ deleted_at: now }).eq('client_id', id).is('deleted_at', null),
  ])

  const firstError = clientRes.error || jobsRes.error || tasksRes.error
  if (firstError) return Response.json({ error: firstError.message }, { status: 500 })
  return Response.json({ success: true })
}
