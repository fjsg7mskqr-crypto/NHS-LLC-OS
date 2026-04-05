import { type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const VALID_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled']

function validateLineItems(items: unknown): items is { description: string; quantity: number; unit_price: number; line_total: number }[] {
  if (!Array.isArray(items)) return false
  return items.every(li =>
    typeof li === 'object' && li !== null &&
    typeof li.description === 'string' && li.description.trim().length > 0 &&
    typeof li.quantity === 'number' && li.quantity >= 0 &&
    typeof li.unit_price === 'number' && li.unit_price >= 0
  )
}

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

  // Validate required fields
  if (!body.invoice_number || typeof body.invoice_number !== 'string' || !body.invoice_number.trim()) {
    return Response.json({ error: 'invoice_number is required' }, { status: 400 })
  }
  if (!body.due_date) {
    return Response.json({ error: 'due_date is required' }, { status: 400 })
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return Response.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  const rawLineItems = (body.line_items || []).filter(
    (li: { description?: string }) => li.description && String(li.description).trim()
  )
  if (rawLineItems.length > 0 && !validateLineItems(rawLineItems)) {
    return Response.json({ error: 'Invalid line items: each must have description, quantity, and unit_price' }, { status: 400 })
  }

  const lineItems = rawLineItems.map((li: { description: string; quantity: number; unit_price: number; line_total?: number }) => ({
    description: li.description.trim(),
    quantity: li.quantity,
    unit_price: li.unit_price,
    line_total: li.line_total ?? li.quantity * li.unit_price,
  }))
  const subtotal = lineItems.reduce((s: number, li: { line_total: number }) => s + li.line_total, 0)
  const tax = body.tax ? Number(body.tax) : 0
  const total = subtotal + tax

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      client_id: body.client_id || null,
      invoice_number: body.invoice_number.trim(),
      status: body.status || 'draft',
      issue_date: body.issue_date || new Date().toISOString().slice(0, 10),
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
      .insert(lineItems.map((li: { description: string; quantity: number; unit_price: number; line_total: number }, i: number) => ({
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

  if (updates.status && !VALID_STATUSES.includes(updates.status)) {
    return Response.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  // If line_items are provided, recalculate totals and replace them
  if (updates.line_items) {
    const filtered = updates.line_items.filter(
      (li: { description?: string }) => li.description && String(li.description).trim()
    )
    if (filtered.length > 0 && !validateLineItems(filtered)) {
      return Response.json({ error: 'Invalid line items' }, { status: 400 })
    }

    const lineItems = filtered.map((li: { description: string; quantity: number; unit_price: number; line_total?: number }) => ({
      description: li.description.trim(),
      quantity: li.quantity,
      unit_price: li.unit_price,
      line_total: li.line_total ?? li.quantity * li.unit_price,
    }))

    updates.subtotal = lineItems.reduce((s: number, li: { line_total: number }) => s + li.line_total, 0)
    updates.total = updates.subtotal + (updates.tax ?? 0)

    // Delete old line items — check for errors before inserting new ones
    const { error: delError } = await supabase.from('invoice_line_items').delete().eq('invoice_id', id)
    if (delError) return Response.json({ error: delError.message }, { status: 500 })

    if (lineItems.length > 0) {
      const { error: insError } = await supabase.from('invoice_line_items').insert(
        lineItems.map((li: { description: string; quantity: number; unit_price: number; line_total: number }, i: number) => ({
          invoice_id: id,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          line_total: li.line_total,
          sort_order: i,
        }))
      )
      if (insError) return Response.json({ error: insError.message }, { status: 500 })
    }
    delete updates.line_items
  }

  if (updates.invoice_number) updates.invoice_number = String(updates.invoice_number).trim()
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
