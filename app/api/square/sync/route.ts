import { type NextRequest } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { createSquareClient } from '@/lib/square'

export const POST = withAuthenticatedRoute(async function POST(_request: NextRequest) {
  const supabase = createServerClient()

  let square
  try {
    square = createSquareClient()
  } catch {
    return Response.json(
      { error: 'Square is not configured. Set SQUARE_ACCESS_TOKEN in environment variables.' },
      { status: 503 }
    )
  }

  const errors: string[] = []
  let synced = 0
  let skipped = 0

  try {
    // Fetch invoices from Supabase that have a square_invoice_id
    const { data: localInvoices, error: dbError } = await supabase
      .from('invoices')
      .select('id, square_invoice_id, status')
      .not('square_invoice_id', 'is', null)
      .is('deleted_at', null)

    if (dbError) {
      return Response.json({ error: dbError.message }, { status: 500 })
    }

    if (!localInvoices || localInvoices.length === 0) {
      return Response.json({ synced: 0, skipped: 0, errors: [], message: 'No invoices linked to Square.' })
    }

    // For each linked invoice, check its status in Square
    for (const invoice of localInvoices) {
      if (invoice.status === 'paid') {
        skipped++
        continue
      }

      try {
        const response = await square.invoices.get({
          invoiceId: invoice.square_invoice_id,
        })

        const squareStatus = response?.invoice?.status

        if (squareStatus === 'PAID') {
          const { error: updateError } = await supabase
            .from('invoices')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', invoice.id)

          if (updateError) {
            errors.push(`Failed to update invoice ${invoice.id}: ${updateError.message}`)
          } else {
            synced++
          }
        } else {
          skipped++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Square API error for invoice ${invoice.id}: ${msg}`)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Square sync failed: ${msg}` }, { status: 500 })
  }

  return Response.json({ synced, skipped, errors })
})
