import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('calendar_blocks')
    .select(`*, property:properties(id, name, client_id)`)
    .order('start_date')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = createServerClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('calendar_blocks')
    .insert({
      property_id: body.property_id || null,
      type: body.type || 'booking',
      start_date: body.start_date,
      end_date: body.end_date,
      notes: body.notes || null,
      source: body.source || 'manual',
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
