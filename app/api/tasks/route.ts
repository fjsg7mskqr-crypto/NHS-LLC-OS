import { type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const limit = request.nextUrl.searchParams.get('limit')

  let query = supabase
    .from('tasks')
    .select(`*, client:clients(id, name), job:jobs(id, title), property:properties(id, name)`)
    .is('deleted_at', null)
    .eq('completed', false)
    .order('priority')
    .order('due_date', { ascending: true, nullsFirst: false })

  if (limit) query = query.limit(Number(limit))

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: body.title,
      priority: body.priority || 'medium',
      due_date: body.due_date || null,
      client_id: body.client_id || null,
      property_id: body.property_id || null,
      job_id: body.job_id || null,
      completed: false,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('tasks')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', body.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
