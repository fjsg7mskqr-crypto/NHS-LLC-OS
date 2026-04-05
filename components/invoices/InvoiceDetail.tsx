'use client'

import { useState } from 'react'
import { ArrowLeft, Send, CheckCircle, ExternalLink } from 'lucide-react'
import { formatCurrency, formatDate, invoiceStatusColor } from '@/lib/utils'
import type { Invoice } from '@/types'

export default function InvoiceDetail({
  invoice,
  onBack,
  onUpdated,
}: {
  invoice: Invoice
  onBack: () => void
  onUpdated: () => void
}) {
  const [updating, setUpdating] = useState(false)

  const markStatus = async (status: 'sent' | 'paid') => {
    setUpdating(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoice.id, status }),
      })
      if (res.ok) onUpdated()
    } catch {}
    setUpdating(false)
  }

  const lineItems = invoice.line_items || []

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to all invoices
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-white">{invoice.invoice_number}</h2>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${invoiceStatusColor(invoice.status)}`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-sm text-slate-400">{invoice.client?.name || 'No client'}</p>
          </div>
          <div className="flex gap-2">
            {invoice.status === 'draft' && (
              <button
                onClick={() => markStatus('sent')}
                disabled={updating}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> Mark as Sent
              </button>
            )}
            {(invoice.status === 'sent' || invoice.status === 'overdue') && (
              <button
                onClick={() => markStatus('paid')}
                disabled={updating}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" /> Mark as Paid
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Issue Date</p>
          <p className="text-sm font-medium text-slate-200">{formatDate(invoice.issue_date)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Due Date</p>
          <p className="text-sm font-medium text-slate-200">{formatDate(invoice.due_date)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Grand Total</p>
          <p className="text-lg font-semibold text-emerald-400">{formatCurrency(invoice.total)}</p>
        </div>
        {invoice.square_invoice_id && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Square Invoice
            </p>
            <p className="text-sm font-mono text-slate-300">{invoice.square_invoice_id}</p>
          </div>
        )}
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-2">Notes</h3>
          <p className="text-sm text-slate-400 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* Line Items */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-white">Line Items</h3>
          <span className="text-xs text-slate-500">{lineItems.length} items</span>
        </div>
        {lineItems.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-sm">No line items</div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Qty</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Unit Price</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {lineItems.map(li => (
                  <tr key={li.id}>
                    <td className="px-5 py-3 text-sm text-slate-200">{li.description}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 text-right">{li.quantity}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 text-right">{formatCurrency(li.unit_price)}</td>
                    <td className="px-5 py-3 text-sm font-medium text-slate-200 text-right">{formatCurrency(li.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t border-slate-800 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-200">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax</span>
                  <span className="text-slate-200">{formatCurrency(invoice.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold pt-1 border-t border-slate-800">
                <span className="text-white">Grand Total</span>
                <span className="text-emerald-400">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
