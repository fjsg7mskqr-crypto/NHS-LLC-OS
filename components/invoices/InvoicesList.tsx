'use client'

import { useState, useEffect } from 'react'
import { Search, ChevronDown, ArrowUpRight, FileText, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatDate, invoiceStatusColor } from '@/lib/utils'
import type { Client, Invoice, InvoiceStatus } from '@/types'

type SortField = 'issue_date' | 'total' | 'status'
type SortDir = 'asc' | 'desc'

export default function InvoicesList({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('issue_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/invoices').then(r => { if (!r.ok) throw new Error(); return r.json() }),
      fetch('/api/clients').then(r => { if (!r.ok) throw new Error(); return r.json() }),
    ]).then(([inv, cli]) => {
      setInvoices(inv || [])
      setClients(cli || [])
    }).catch(() => setFetchError(true)).finally(() => setLoading(false))
  }, [])

  const filtered = invoices
    .filter(inv => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false
      if (clientFilter !== 'all' && inv.client_id !== clientFilter) return false
      if (
        search &&
        !inv.invoice_number.toLowerCase().includes(search.toLowerCase()) &&
        !inv.client?.name?.toLowerCase().includes(search.toLowerCase())
      ) return false
      return true
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'issue_date') return dir * (new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime())
      if (sortField === 'total') return dir * (a.total - b.total)
      if (sortField === 'status') return dir * a.status.localeCompare(b.status)
      return 0
    })

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const sortIndicator = (field: SortField) => sortField === field ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : ''

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoices..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Invoice #</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Client</th>
              <th
                onClick={() => toggleSort('issue_date')}
                className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell cursor-pointer hover:text-slate-300"
              >
                Date{sortIndicator('issue_date')}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden lg:table-cell">Due Date</th>
              <th
                onClick={() => toggleSort('total')}
                className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-300"
              >
                Amount{sortIndicator('total')}
              </th>
              <th
                onClick={() => toggleSort('status')}
                className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-300"
              >
                Status{sortIndicator('status')}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden xl:table-cell">Square ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map(inv => (
              <tr
                key={inv.id}
                onClick={() => onSelect(inv.id)}
                className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                      {inv.invoice_number}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" />
                  </div>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <span className="text-sm text-slate-400">{inv.client?.name || '—'}</span>
                </td>
                <td className="px-4 py-3.5 hidden sm:table-cell">
                  <span className="text-sm text-slate-400">{formatDate(inv.issue_date)}</span>
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  <span className="text-sm text-slate-400">{formatDate(inv.due_date)}</span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="text-sm font-medium text-slate-200">{formatCurrency(inv.total)}</span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${invoiceStatusColor(inv.status)}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 hidden xl:table-cell">
                  <span className="text-xs font-mono text-slate-500">{inv.square_invoice_id || '—'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="py-12 text-center text-slate-500 text-sm">Loading invoices...</div>
        )}
        {fetchError && (
          <div className="py-12 text-center text-red-400 text-sm">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
            Failed to load invoices. Check your connection and refresh.
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-700 empty-state-icon" />
            No invoices match your filters
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-t border-slate-800">
        <p className="text-xs text-slate-600">{filtered.length} invoices shown</p>
      </div>
    </div>
  )
}
