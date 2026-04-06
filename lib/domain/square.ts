import type { SupabaseClient } from '@supabase/supabase-js'
import { createSquareClient } from '@/lib/square'

export async function syncSquareInvoices(supabase: SupabaseClient) {
  let square
  try {
    square = createSquareClient()
  } catch (error) {
    throw error instanceof Error ? error : new Error('Square client configuration error')
  }

  const locationId = process.env.SQUARE_LOCATION_ID
  if (!locationId) {
    throw new Error('SQUARE_LOCATION_ID is not configured')
  }

  const SQUARE_STATUS_MAP: Record<string, string> = {
    DRAFT: 'draft',
    UNPAID: 'unpaid',
    PAID: 'paid',
    PARTIALLY_PAID: 'partially_paid',
    OVERDUE: 'overdue',
    CANCELED: 'cancelled',
    CANCELLED: 'cancelled',
    PAYMENT_PENDING: 'unpaid',
    SCHEDULED: 'draft',
  }

  const errors: string[] = []
  let synced = 0
  let skipped = 0

  try {
    const page = await square.invoices.list({ locationId })
    const invoices = page?.data ?? []

    if (invoices.length === 0) {
      return { synced: 0, skipped: 0, errors: [], message: 'No invoices found in Square.' }
    }

    // Load existing clients for email matching
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, email, square_customer_id')
      .is('deleted_at', null)

    for (const inv of invoices) {
      const squareId = inv.id
      if (!squareId) { skipped++; continue }

      try {
        const rawStatus = inv.status ?? 'DRAFT'
        const status = SQUARE_STATUS_MAP[rawStatus] || 'draft'
        const primaryRecipient = inv.primaryRecipient
        const customerEmail = primaryRecipient?.emailAddress

        // Try to match client by square_customer_id, then by email, then by name
        let matchedClientId: string | null = null
        const customerId = primaryRecipient?.customerId
        if (clients && customerId) {
          const byCustomerId = clients.find(c => c.square_customer_id === customerId)
          if (byCustomerId) matchedClientId = byCustomerId.id
        }
        if (!matchedClientId && clients && customerEmail) {
          const byEmail = clients.find(c => c.email?.toLowerCase() === customerEmail.toLowerCase())
          if (byEmail) matchedClientId = byEmail.id
        }

        const totalMoney = inv.paymentRequests?.[0]?.computedAmountMoney
        const totalAmount = totalMoney?.amount ? Number(totalMoney.amount) / 100 : 0

        const paidAmount = inv.paymentRequests?.[0]?.totalCompletedAmountMoney
        const amountPaid = paidAmount?.amount ? Number(paidAmount.amount) / 100 : 0

        const amountDue = totalAmount - amountPaid

        const { error: upsertError } = await supabase
          .from('square_invoices')
          .upsert(
            {
              square_id: squareId,
              client_id: matchedClientId,
              status,
              total_amount: totalAmount,
              amount_paid: amountPaid,
              amount_due: amountDue,
              issued_date: inv.createdAt ? inv.createdAt.slice(0, 10) : null,
              due_date: inv.paymentRequests?.[0]?.dueDate ?? null,
              paid_date: status === 'paid' ? (inv.paymentRequests?.[0]?.dueDate ?? new Date().toISOString().slice(0, 10)) : null,
              last_synced_at: new Date().toISOString(),
            },
            { onConflict: 'square_id' }
          )

        if (upsertError) {
          errors.push(`Failed to upsert ${squareId}: ${upsertError.message}`)
        } else {
          synced++
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Error processing invoice ${squareId}: ${message}`)
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Square API error: ${message}`)
  }

  return {
    synced,
    skipped,
    errors,
    message: `Square sync complete. ${synced} updated, ${skipped} skipped.`,
  }
}
