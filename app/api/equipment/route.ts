import { type NextRequest } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

const VALID_LOCATIONS = ['home_base', 'den', 'lodge', 'in_truck', 'other']
const VALID_CONDITIONS = ['excellent', 'good', 'fair', 'needs_repair']

export const GET = withAuthenticatedRoute(async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .order('name')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
})

export const POST = withAuthenticatedRoute(async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }
  if (body.location && !VALID_LOCATIONS.includes(body.location)) {
    return Response.json({ error: `location must be one of: ${VALID_LOCATIONS.join(', ')}` }, { status: 400 })
  }
  if (body.condition && !VALID_CONDITIONS.includes(body.condition)) {
    return Response.json({ error: `condition must be one of: ${VALID_CONDITIONS.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('equipment')
    .insert({
      name: body.name.trim(),
      type: body.type || null,
      location: body.location || 'home_base',
      condition: body.condition || 'good',
      notes: body.notes || null,
    })
    .select('*')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
})

export const PATCH = withAuthenticatedRoute(async function PATCH(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })
  if (updates.name !== undefined && (!updates.name || !String(updates.name).trim())) {
    return Response.json({ error: 'name cannot be empty' }, { status: 400 })
  }
  if (updates.name) updates.name = String(updates.name).trim()
  if (updates.location && !VALID_LOCATIONS.includes(updates.location)) {
    return Response.json({ error: `location must be one of: ${VALID_LOCATIONS.join(', ')}` }, { status: 400 })
  }
  if (updates.condition && !VALID_CONDITIONS.includes(updates.condition)) {
    return Response.json({ error: `condition must be one of: ${VALID_CONDITIONS.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('equipment')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
})

export const DELETE = withAuthenticatedRoute(async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const id = request.nextUrl.searchParams.get('id')

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('equipment')
    .delete()
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
})
