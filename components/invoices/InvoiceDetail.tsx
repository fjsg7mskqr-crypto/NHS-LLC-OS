'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Send, CheckCircle, ExternalLink, Trash2, Pencil, Plus, X } from 'lucide-react'
import { formatCurrency, formatDate, invoiceStatusColor } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'
import type { Invoice, Client, InvoiceStatus } from '@/types'

interface LineItemEdit {
  description: string
  quantity: string
  unit_price: string
}

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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit form state
  const [clients, setClients] = useState<Client[]>([])
  const [editForm, setEditForm] = useState({
    invoice_number: invoice.invoice_number,
    client_id: invoice.client_id || '',
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    notes: invoice.notes || '',
    square_invoice_id: invoice.square_invoice_id || '',
    status: invoice.status as Exclude<InvoiceStatus, 'overdue'>,
    tax: String(invoice.tax),
  })
  const [editLines, setEditLines] = useState<LineItemEdit[]>(
    (invoice.line_items || []).map(li => ({
      description: li.description,
      quantity: String(li.quantity),
      unit_price: String(li.unit_price),
    }))
  )

  useEffect(() => {
    if (editing) {
      fetch('/api/clients').then(r => r.json()).then(d => setClients(d || [])).catch(() => {})
    }
  }, [editing])

  const handleDelete = async () => {
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch(`/api/invoices?id=${invoice.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Delete failed') }
      onUpdated()
    } catch (e) { setError(e instanceof Error ? e.message : 'Delete failed') }
    setUpdating(false)
  }

  const markStatus = async (status: 'sent' | 'paid') => {
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch('/api/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoice.id, status }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Update failed') }
      onUpdated()
    } catch (e) { setError(e instanceof Error ? e.message : 'Update failed') }
    setUpdating(false)
  }

  const computedLines = editLines.map(li => ({
    description: li.description,
    quantity: Number(li.quantity) || 0,
    unit_price: Number(li.unit_price) || 0,
    line_total: (Number(li.quantity) || 0) * (Number(li.unit_price) || 0),
    sort_order: 0,
  }))
  const editSubtotal = computedLines.reduce((s, li) => s + li.line_total, 0)
  const editTax = Number(editForm.tax) || 0
  const editTotal = editSubtotal + editTax

  const updateLine = (idx: number, field: keyof LineItemEdit, value: string) => {
    setEditLines(prev => prev.map((li, i) => (i === idx ? { ...li, [field]: value } : li)))
  }

  const handleSaveEdit = async () => {
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch('/api/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: invoice.id,
          invoice_number: editForm.invoice_number,
          client_id: editForm.client_id || null,
          issue_date: editForm.issue_date,
          due_date: editForm.due_date,
          notes: editForm.notes || null,
          square_invoice_id: editForm.square_invoice_id || null,
          status: editForm.status,
          tax: editTax,
          line_items: computedLines.filter(li => li.description.trim()),
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Save failed') }
      onUpdated()
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed') }
    setUpdating(false)
  }

  const lineItems = invoice.line_items || []

  if (editing) {
    return (
      <div className="space-y-6">
        <div>
          <button onClick={() => setEditing(false)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4">
            <X className="w-4 h-4" /> Cancel editing
          </button>
          <h2 className="text-xl font-bold text-white">Edit Invoice</h2>
        </div>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Invoice Number</label>
              <input type="text" value={editForm.invoice_number} onChange={e => setEditForm(f => ({ ...f, invoice_number: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Client</label>
              <select value={editForm.client_id} onChange={e => setEditForm(f => ({ ...f, client_id: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                <option value="">— Select —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Issue Date</label>
              <input type="date" value={editForm.issue_date} onChange={e => setEditForm(f => ({ ...f, issue_date: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Due Date</label>
              <input type="date" value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Status</label>
              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as typeof editForm.status }))} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-2">Line Items</label>
            <div className="space-y-2">
              {editLines.map((li, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <input type="text" value={li.description} onChange={e => updateLine(idx, 'description', e.target.value)} placeholder="Description" className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
                  <input type="number" value={li.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} placeholder="Qty" min="0" step="0.01" className="w-20 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
                  <input type="number" value={li.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} placeholder="Price" min="0" step="0.01" className="w-24 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
                  <span className="w-20 py-2 text-sm text-slate-400 text-right">{formatCurrency(computedLines[idx]?.line_total || 0)}</span>
                  <button type="button" onClick={() => setEditLines(prev => prev.filter((_, i) => i !== idx))} disabled={editLines.length <= 1} className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setEditLines(prev => [...prev, { description: '', quantity: '1', unit_price: '' }])} className="mt-2 flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
              <Plus className="w-3 h-3" /> Add line item
            </button>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-200">{formatCurrency(editSubtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Tax</span>
              <input type="number" value={editForm.tax} onChange={e => setEditForm(f => ({ ...f, tax: e.target.value }))} min="0" step="0.01" className="w-28 px-2 py-1 rounded bg-slate-700 border border-slate-600 text-sm text-slate-200 text-right focus:outline-none focus:border-emerald-500" />
            </div>
            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-slate-700">
              <span className="text-white">Grand Total</span>
              <span className="text-emerald-400">{formatCurrency(editTotal)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Square Invoice ID</label>
            <input type="text" value={editForm.square_invoice_id} onChange={e => setEditForm(f => ({ ...f, square_invoice_id: e.target.value }))} placeholder="Link to Square invoice" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditing(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors">Cancel</button>
            <button onClick={handleSaveEdit} disabled={updating} className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50">{updating ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </div>
      </div>
    )
  }

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
            {invoice.status !== 'paid' && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
            )}
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
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Delete this invoice?</span>
                <button
                  onClick={handleDelete}
                  disabled={updating}
                  className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/30 text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Invoice info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
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
