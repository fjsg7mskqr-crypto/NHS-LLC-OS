import { type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const status = request.nextUrl.searchParams.get('status')
  const clientId = request.nextUrl.searchParams.get('client_id')

  let query = supabase
    .from('invoices')
    .select(`*, client:clients(*), line_items:invoice_line_items(*)`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  const lineItems: { description: string; quantity: number; unit_price: number; line_total: number; sort_order: number }[] = body.line_items || []
  const subtotal = lineItems.reduce((s, li) => s + li.line_total, 0)
  const tax = body.tax ? Number(body.tax) : 0
  const total = subtotal + tax

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      client_id: body.client_id || null,
      invoice_number: body.invoice_number,
      status: body.status || 'draft',
      issue_date: body.issue_date,
      due_date: body.due_date,
      notes: body.notes || null,
      square_invoice_id: body.square_invoice_id || null,
      subtotal,
      tax,
      total,
    })
    .select(`*, client:clients(*)`)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (lineItems.length > 0) {
    const { error: liError } = await supabase
      .from('invoice_line_items')
      .insert(lineItems.map((li, i) => ({
        invoice_id: invoice.id,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        line_total: li.line_total,
        sort_order: i,
      })))

    if (liError) return Response.json({ error: liError.message }, { status: 500 })
  }

  return Response.json(invoice, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  // If line_items are provided, recalculate totals and replace them
  if (updates.line_items) {
    const lineItems: { description: string; quantity: number; unit_price: number; line_total: number; sort_order: number }[] = updates.line_items
    updates.subtotal = lineItems.reduce((s, li) => s + li.line_total, 0)
    updates.total = updates.subtotal + (updates.tax ?? 0)

    // Delete old line items and insert new ones
    await supabase.from('invoice_line_items').delete().eq('invoice_id', id)
    if (lineItems.length > 0) {
      await supabase.from('invoice_line_items').insert(
        lineItems.map((li, i) => ({
          invoice_id: id,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          line_total: li.line_total,
          sort_order: i,
        }))
      )
    }
    delete updates.line_items
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select(`*, client:clients(*), line_items:invoice_line_items(*)`)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const id = request.nextUrl.searchParams.get('id')

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
