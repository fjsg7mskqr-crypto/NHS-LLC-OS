'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import InvoicesList from './InvoicesList'
import InvoiceDetail from './InvoiceDetail'
import CreateInvoiceModal from './CreateInvoiceModal'
import { formatCurrency } from '@/lib/utils'
import type { Invoice } from '@/types'

export default function InvoicesTab() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [listKey, setListKey] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/invoices')
      .then(r => r.json())
      .then((data: Invoice[]) => setInvoices(data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [listKey])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)

  const outstanding = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + i.total, 0)
  const overdue = invoices
    .filter(i => i.status === 'overdue')
    .reduce((s, i) => s + i.total, 0)
  const paidThisMonth = invoices
    .filter(i => i.status === 'paid' && i.updated_at >= monthStart)
    .reduce((s, i) => s + i.total, 0)
  const paidYTD = invoices
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

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Outstanding</p>
          <p className="text-lg font-semibold text-amber-400">{formatCurrency(outstanding)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Overdue</p>
          <p className="text-lg font-semibold text-red-400">{formatCurrency(overdue)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Paid (This Month)</p>
          <p className="text-lg font-semibold text-emerald-400">{formatCurrency(paidThisMonth)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Paid (YTD)</p>
          <p className="text-lg font-semibold text-emerald-400">{formatCurrency(paidYTD)}</p>
        </div>
      </div>

      {selectedInvoice ? (
        <InvoiceDetail
          key={selectedInvoice.id}
          invoice={selectedInvoice}
          onBack={handleBack}
          onUpdated={handleUpdated}
        />
      ) : (
        <InvoicesList key={listKey} onSelect={handleSelect} />
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
