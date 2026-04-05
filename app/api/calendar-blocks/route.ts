import { type NextRequest } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

const VALID_TYPES = ['sbr_booking', 'job_day']

export const GET = withAuthenticatedRoute(async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('calendar_blocks')
    .select(`*, property:properties(id, name, client_id)`)
    .order('start_date')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
})

export const POST = withAuthenticatedRoute(async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  if (!body.start_date) return Response.json({ error: 'start_date is required' }, { status: 400 })
  if (!body.end_date) return Response.json({ error: 'end_date is required' }, { status: 400 })
  if (body.type && !VALID_TYPES.includes(body.type)) {
    return Response.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('calendar_blocks')
    .insert({
      property_id: body.property_id || null,
      type: body.type || 'job_day',
      start_date: body.start_date,
      end_date: body.end_date,
      notes: body.notes || null,
      source: body.source || 'manual',
    })
    .select(`*, property:properties(id, name, client_id)`)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
})

export const PATCH = withAuthenticatedRoute(async function PATCH(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })
  if (updates.type && !VALID_TYPES.includes(updates.type)) {
    return Response.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('calendar_blocks')
    .update(updates)
    .eq('id', id)
    .select(`*, property:properties(id, name, client_id)`)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
})

export const DELETE = withAuthenticatedRoute(async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const id = request.nextUrl.searchParams.get('id')

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('calendar_blocks')
    .delete()
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
})
