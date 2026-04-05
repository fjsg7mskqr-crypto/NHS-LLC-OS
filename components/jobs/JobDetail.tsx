'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, MapPin, Clock, DollarSign, CheckCircle, ExternalLink } from 'lucide-react'
import { formatCurrency, formatHours, formatMinutes, statusColor, CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/utils'
import type { Job, CategoryType, SquareInvoice, TimeEntry } from '@/types'

export default function JobDetail({ job, onBack }: { job: Job; onBack: () => void }) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [invoice, setInvoice] = useState<SquareInvoice | null>(null)

  useEffect(() => {
    fetch(`/api/time-entries?job_id=${job.id}`)
      .then(r => r.json()).then((data: TimeEntry[]) => {
        setEntries((data || []).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()))
      })
      .catch(() => {})
    if (job.square_invoice_id) {
      fetch('/api/square-invoices').then(r => r.json()).then((invs: SquareInvoice[]) => {
        setInvoice((invs || []).find(i => i.square_id === job.square_invoice_id) || null)
      }).catch(() => {})
    }
  }, [job.id, job.square_invoice_id])

  const billableMinutes = entries.filter(e => e.billable).reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const billedAmount = entries.filter(e => e.billable).reduce((s, e) => s + (e.billable_amount || 0), 0)
  const effectiveRate = billableMinutes > 0 ? billedAmount / (billableMinutes / 60) : 0

  const client = job.client
  const property = job.property

  const invoiceStatusColor: Record<string, string> = {
    paid: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    unpaid: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    overdue: 'text-red-400 bg-red-500/15 border-red-500/30',
    draft: 'text-slate-400 bg-slate-500/15 border-slate-500/30',
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to all jobs
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-white">{job.title}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(job.status)}`}>{job.status.replace('_', ' ')}</span>
            </div>
            {job.description && <p className="text-sm text-slate-400 max-w-xl">{job.description}</p>}
          </div>
          {job.status !== 'complete' && (
            <button className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Mark Complete
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Client</p>
          <p className="text-sm font-medium text-slate-200">{client?.name || '—'}</p>
          {client?.phone && <p className="text-xs text-slate-500 mt-0.5">{client.phone}</p>}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />Property</p>
          <p className="text-sm font-medium text-slate-200">{property?.name || '—'}</p>
          {property?.address && <p className="text-xs text-slate-500 mt-0.5 truncate">{property.address}</p>}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />Hours</p>
          <p className="text-sm font-medium text-slate-200">{formatHours(billableMinutes / 60)} billable</p>
          <p className="text-xs text-slate-500 mt-0.5">{formatHours(totalMinutes / 60)} total</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" />Value</p>
          <p className="text-sm font-medium text-emerald-400">{billedAmount > 0 ? formatCurrency(billedAmount) : '—'}</p>
          <p className="text-xs text-slate-500 mt-0.5">{effectiveRate > 0 ? `$${effectiveRate.toFixed(0)}/hr eff.` : `$${job.hourly_rate || '—'}/hr target`}</p>
        </div>
      </div>
      {invoice && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><ExternalLink className="w-4 h-4 text-slate-400" />Linked Square Invoice</h3>
          <div className="flex flex-wrap items-center gap-6">
            <div><p className="text-xs text-slate-500">Invoice ID</p><p className="text-sm font-mono text-slate-300">{invoice.square_id}</p></div>
            <div><p className="text-xs text-slate-500">Total</p><p className="text-sm font-medium text-white">{formatCurrency(invoice.total_amount || 0)}</p></div>
            <div><p className="text-xs text-slate-500">Paid</p><p className="text-sm font-medium text-emerald-400">{formatCurrency(invoice.amount_paid)}</p></div>
            <div><p className="text-xs text-slate-500">Due</p><p className="text-sm text-slate-300">{invoice.due_date || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Status</p><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${invoiceStatusColor[invoice.status] || ''}`}>{invoice.status}</span></div>
          </div>
        </div>
      )}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-white">Time Entries</h3>
          <span className="text-xs text-slate-500">{entries.length} entries</span>
        </div>
        {entries.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-sm">No time entries for this job</div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {entries.map(entry => {
              const color = CATEGORY_COLORS[entry.category as CategoryType]
              const dateStr = new Date(entry.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              return (
                <div key={entry.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/30 transition-colors">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color }}>{CATEGORY_LABELS[entry.category as CategoryType] || entry.category}</span>
                      <span className="text-xs text-slate-600">{dateStr}</span>
                    </div>
                    {entry.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{entry.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-mono text-slate-300">{formatMinutes(entry.duration_minutes || 0)}</p>
                    {entry.billable_amount && <p className="text-xs text-emerald-400">{formatCurrency(entry.billable_amount)}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
