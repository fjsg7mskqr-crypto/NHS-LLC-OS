'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import InvoicesList from './InvoicesList'
import InvoiceDetail from './InvoiceDetail'
import CreateInvoiceModal from './CreateInvoiceModal'
import ErrorBanner from '@/components/ui/ErrorBanner'
import { formatCurrency, invoiceStatusColor } from '@/lib/utils'
import type { Invoice, SquareInvoice } from '@/types'
import { format } from 'date-fns'

export default function InvoicesTab() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [squareInvoices, setSquareInvoices] = useState<SquareInvoice[]>([])
  const [listKey, setListKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'manual' | 'square'>('square')

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetch('/api/invoices').then(r => r.ok ? r.json() : []),
      fetch('/api/square-invoices').then(async r => {
        if (!r.ok) {
          const text = await r.text().catch(() => '')
          console.error('square-invoices fetch failed:', r.status, text)
          return []
        }
        return r.json()
      }),
    ])
      .then(([manual, square]) => {
        setInvoices(Array.isArray(manual) ? manual : [])
        setSquareInvoices(Array.isArray(square) ? square : [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [listKey])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)

  // Combine both sources for summary metrics
  const sqOutstanding = squareInvoices
    .filter(i => i.status === 'unpaid' || i.status === 'overdue' || i.status === 'partially_paid')
    .reduce((s, i) => s + Number(i.amount_due), 0)
  const manualOutstanding = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + i.total, 0)
  const outstanding = sqOutstanding + manualOutstanding

  const sqOverdue = squareInvoices
    .filter(i => i.status === 'overdue')
    .reduce((s, i) => s + Number(i.amount_due), 0)
  const manualOverdue = invoices
    .filter(i => i.status === 'overdue')
    .reduce((s, i) => s + i.total, 0)
  const overdue = sqOverdue + manualOverdue

  const sqPaidMonth = squareInvoices
    .filter(i => i.status === 'paid' && i.paid_date && i.paid_date >= monthStart)
    .reduce((s, i) => s + Number(i.amount_paid), 0)
  const paidThisMonth = sqPaidMonth + invoices
    .filter(i => i.status === 'paid' && i.updated_at >= monthStart)
    .reduce((s, i) => s + i.total, 0)

  const sqPaidYTD = squareInvoices
    .filter(i => i.status === 'paid' && i.paid_date && i.paid_date >= yearStart)
    .reduce((s, i) => s + Number(i.amount_paid), 0)
  const paidYTD = sqPaidYTD + invoices
    .filter(i => i.status === 'paid' && i.updated_at >= yearStart)
    .reduce((s, i) => s + i.total, 0)

  const handleSelect = (id: string) => {
    const inv = invoices.find(i => i.id === id)
    if (inv) setSelectedInvoice(inv)
  }

  const handleBack = () => setSelectedInvoice(null)

  const handleUpdated = () => {
    setSelectedInvoice(null)
    setListKey(k => k + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Invoices</h1>
          <p className="text-sm text-slate-500">{loading ? 'Loading...' : `${invoices.length} total`}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
        <div className="metric-card metric-card--amber rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Outstanding</p>
          <p className="text-lg font-semibold text-amber-400 glow-amber">{formatCurrency(outstanding)}</p>
        </div>
        <div className="metric-card metric-card--red rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Overdue</p>
          <p className="text-lg font-semibold text-red-400 glow-red">{formatCurrency(overdue)}</p>
        </div>
        <div className="metric-card metric-card--emerald rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Paid (This Month)</p>
          <p className="text-lg font-semibold text-emerald-400 glow-emerald">{formatCurrency(paidThisMonth)}</p>
        </div>
        <div className="metric-card metric-card--emerald rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Paid (YTD)</p>
          <p className="text-lg font-semibold text-emerald-400 glow-emerald">{formatCurrency(paidYTD)}</p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('square')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            view === 'square'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
              : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          Square ({squareInvoices.length})
        </button>
        <button
          onClick={() => setView('manual')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            view === 'manual'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
              : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          Manual ({invoices.length})
        </button>
      </div>

      {view === 'manual' ? (
        selectedInvoice ? (
          <InvoiceDetail
            key={selectedInvoice.id}
            invoice={selectedInvoice}
            onBack={handleBack}
            onUpdated={handleUpdated}
          />
        ) : (
          <InvoicesList key={listKey} onSelect={handleSelect} />
        )
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Due</th>
                  <th className="px-4 py-3 font-medium">Issued</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium">Last Synced</th>
                </tr>
              </thead>
              <tbody>
                {squareInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No Square invoices synced yet. Hit &quot;Sync Square&quot; to pull them in.
                    </td>
                  </tr>
                ) : (
                  squareInvoices.map(inv => (
                    <tr key={inv.square_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-200">
                        {inv.client?.name || <span className="text-slate-600">Unmatched</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${invoiceStatusColor(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-200">{formatCurrency(Number(inv.total_amount))}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(Number(inv.amount_paid))}</td>
                      <td className="px-4 py-3 text-right text-amber-400">
                        {Number(inv.amount_due) > 0 ? formatCurrency(Number(inv.amount_due)) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {inv.issued_date ? format(new Date(inv.issued_date + 'T12:00:00'), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {inv.due_date ? format(new Date(inv.due_date + 'T12:00:00'), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {format(new Date(inv.last_synced_at), 'MMM d, h:mm a')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onCreated={() => setListKey(k => k + 1)}
        />
      )}
    </div>
  )
}
