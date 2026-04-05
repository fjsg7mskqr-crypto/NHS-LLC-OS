'use client'

import { useState, useEffect, useCallback, useId } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'
import type { Client, InvoiceStatus } from '@/types'

interface LineItemForm {
  description: string
  quantity: string
  unit_price: string
}

interface InvoiceForm {
  invoice_number: string
  client_id: string
  issue_date: string
  due_date: string
  notes: string
  square_invoice_id: string
  status: Exclude<InvoiceStatus, 'overdue'>
  tax: string
}

export default function CreateInvoiceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated?: () => void
}) {
  const titleId = useId()
  const today = new Date().toISOString().slice(0, 10)
  const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const [form, setForm] = useState<InvoiceForm>({
    invoice_number: '',
    client_id: '',
    issue_date: today,
    due_date: due,
    notes: '',
    square_invoice_id: '',
    status: 'draft',
    tax: '0',
  })
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    { description: '', quantity: '1', unit_price: '' },
  ])
  const [clients, setClients] = useState<Client[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof InvoiceForm>(key: K, value: InvoiceForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => setClients(d || []))
      .catch(() => {})
  }, [])

  // ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const updateLine = (idx: number, field: keyof LineItemForm, value: string) => {
    setLineItems(prev => prev.map((li, i) => (i === idx ? { ...li, [field]: value } : li)))
  }
  const addLine = () => setLineItems(prev => [...prev, { description: '', quantity: '1', unit_price: '' }])
  const removeLine = (idx: number) => setLineItems(prev => prev.filter((_, i) => i !== idx))

  const computedLines = lineItems.map(li => ({
    description: li.description,
    quantity: Number(li.quantity) || 0,
    unit_price: Number(li.unit_price) || 0,
    line_total: (Number(li.quantity) || 0) * (Number(li.unit_price) || 0),
    sort_order: 0,
  }))
  const subtotal = computedLines.reduce((s, li) => s + li.line_total, 0)
  const tax = Number(form.tax) || 0
  const total = subtotal + tax

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.invoice_number.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tax,
          line_items: computedLines.filter(li => li.description.trim()),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to create invoice')
      }
      onCreated?.()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create invoice')
    }
    setSaving(false)
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 id={titleId} className="font-semibold text-white">Create New Invoice</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-number" className="block text-xs text-slate-500 mb-1">Invoice Number *</label>
              <input id="inv-number" type="text" value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} required placeholder="INV-001" className={inputClass} />
            </div>
            <div>
              <label htmlFor="inv-client" className="block text-xs text-slate-500 mb-1">Client</label>
              <select id="inv-client" value={form.client_id} onChange={e => set('client_id', e.target.value)} className={inputClass}>
                <option value="">— Select —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="inv-issue" className="block text-xs text-slate-500 mb-1">Issue Date *</label>
              <input id="inv-issue" type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="inv-due" className="block text-xs text-slate-500 mb-1">Due Date *</label>
              <input id="inv-due" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="inv-status" className="block text-xs text-slate-500 mb-1">Status</label>
              <select id="inv-status" value={form.status} onChange={e => set('status', e.target.value as InvoiceForm['status'])} className={inputClass}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          {/* Line Items */}
          <fieldset>
            <legend className="block text-xs text-slate-500 mb-2">Line Items</legend>
            <div className="space-y-2">
              {lineItems.map((li, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <input type="text" value={li.description} onChange={e => updateLine(idx, 'description', e.target.value)} placeholder="Description" aria-label={`Line item ${idx + 1} description`} className={`flex-1 ${inputClass}`} />
                  <input type="number" value={li.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} placeholder="Qty" min="0" step="0.01" aria-label={`Line item ${idx + 1} quantity`} className={`w-20 ${inputClass}`} />
                  <input type="number" value={li.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} placeholder="Price" min="0" step="0.01" aria-label={`Line item ${idx + 1} unit price`} className={`w-24 ${inputClass}`} />
                  <span className="w-20 py-2 text-sm text-slate-400 text-right">{formatCurrency(computedLines[idx]?.line_total || 0)}</span>
                  <button type="button" onClick={() => removeLine(idx)} disabled={lineItems.length <= 1} aria-label={`Remove line item ${idx + 1}`} className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addLine} className="mt-2 flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
              <Plus className="w-3 h-3" /> Add line item
            </button>
          </fieldset>

          {/* Totals */}
          <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-200">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <label htmlFor="inv-tax" className="text-slate-500">Tax</label>
              <input id="inv-tax" type="number" value={form.tax} onChange={e => set('tax', e.target.value)} min="0" step="0.01" className="w-28 px-2 py-1 rounded bg-slate-700 border border-slate-600 text-sm text-slate-200 text-right focus:outline-none focus:border-emerald-500" />
            </div>
            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-slate-700">
              <span className="text-white">Grand Total</span>
              <span className="text-emerald-400">{formatCurrency(total)}</span>
            </div>
          </div>

          <div>
            <label htmlFor="inv-notes" className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea id="inv-notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Payment terms, additional info..." className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label htmlFor="inv-square" className="block text-xs text-slate-500 mb-1">Square Invoice ID (optional)</label>
            <input id="inv-square" type="text" value={form.square_invoice_id} onChange={e => set('square_invoice_id', e.target.value)} placeholder="Link to existing Square invoice" className={inputClass} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Create Invoice'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
