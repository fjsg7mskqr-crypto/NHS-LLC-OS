import { type NextRequest } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAuthenticatedRoute(async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const status = request.nextUrl.searchParams.get('status')
  const clientId = request.nextUrl.searchParams.get('client_id')

  let query = supabase
    .from('square_invoices')
    .select(`*, client:clients(id, name, email), job:jobs(id, title)`)
    .order('issued_date', { ascending: false })

  if (status) query = query.eq('status', status)
  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
})

export const PATCH = withAuthenticatedRoute(async function PATCH(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()
  const { square_id, job_id, client_id } = body

  if (!square_id) return Response.json({ error: 'square_id is required' }, { status: 400 })

  const updates: Record<string, string | null> = {}
  if (job_id !== undefined) updates.job_id = job_id || null
  if (client_id !== undefined) updates.client_id = client_id || null

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('square_invoices')
    .update(updates)
    .eq('square_id', square_id)
    .select(`*, client:clients(id, name, email), job:jobs(id, title)`)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
})
