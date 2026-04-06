import { type NextRequest } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

const VALID_TYPES = ['residential', 'commercial', 'vacation_rental', 'other']

function isMissingTypeColumnError(error: { message?: string } | null) {
  return typeof error?.message === 'string'
    && error.message.includes("Could not find the 'type' column of 'properties' in the schema cache")
}

export const GET = withAuthenticatedRoute(async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const clientId = request.nextUrl.searchParams.get('client_id')

  let query = supabase
    .from('properties')
    .select('*, client:clients(id, name)')
    .order('name')

  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
})

export const POST = withAuthenticatedRoute(async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }
  if (!body.client_id) {
    return Response.json({ error: 'client_id is required' }, { status: 400 })
  }
  if (body.type && !VALID_TYPES.includes(body.type)) {
    return Response.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
  }

  const insertPayload = {
    client_id: body.client_id,
    name: body.name.trim(),
    address: body.address || null,
    type: body.type || 'residential',
    notes: body.notes || null,
  }

  let { data, error } = await supabase
    .from('properties')
    .insert(insertPayload)
    .select('*, client:clients(id, name)')
    .single()

  if (isMissingTypeColumnError(error)) {
    const fallbackInsertPayload = { ...insertPayload }
    delete fallbackInsertPayload.type
    const retry = await supabase
      .from('properties')
      .insert(fallbackInsertPayload)
      .select('*, client:clients(id, name)')
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
})

export const PATCH = withAuthenticatedRoute(async function PATCH(request: NextRequest) {
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
  if (updates.type && !VALID_TYPES.includes(updates.type)) {
    return Response.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
  }

  let { data, error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', id)
    .select('*, client:clients(id, name)')
    .single()

  if (isMissingTypeColumnError(error) && 'type' in updates) {
    const fallbackUpdates = { ...updates }
    delete fallbackUpdates.type
    if (Object.keys(fallbackUpdates).length === 0) {
      const retry = await supabase
        .from('properties')
        .select('*, client:clients(id, name)')
        .eq('id', id)
        .single()
      data = retry.data
      error = retry.error
    } else {
      const retry = await supabase
        .from('properties')
        .update(fallbackUpdates)
        .eq('id', id)
        .select('*, client:clients(id, name)')
        .single()
      data = retry.data
      error = retry.error
    }
  }

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
})

export const DELETE = withAuthenticatedRoute(async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const id = request.nextUrl.searchParams.get('id')

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
})
