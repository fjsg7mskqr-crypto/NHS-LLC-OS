'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, MapPin, Clock, DollarSign, CheckCircle, ExternalLink, Repeat, CalendarDays, Pencil, Trash2, X } from 'lucide-react'
import { formatCurrency, formatHours, formatMinutes, statusColor, CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'
import type { Job, CategoryType, Invoice, TimeEntry, Client, Property } from '@/types'

export default function JobDetail({ job, onBack, onUpdated }: { job: Job; onBack: () => void; onUpdated?: () => void }) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [editing, setEditing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit state
  const [clients, setClients] = useState<Client[]>([])
  const [allProperties, setAllProperties] = useState<Property[]>([])
  const [editForm, setEditForm] = useState({
    title: job.title,
    description: job.description || '',
    client_id: job.client_id || '',
    property_id: job.property_id || '',
    hourly_rate: String(job.hourly_rate || ''),
    status: job.status as string,
    scheduled_date: job.scheduled_date || '',
    is_recurring: job.is_recurring || false,
    recurrence: job.recurrence || 'weekly',
    notes: (job as Job & { notes?: string }).notes || '',
  })

  useEffect(() => {
    fetch(`/api/time-entries?job_id=${job.id}`)
      .then(r => r.json()).then((data: TimeEntry[]) => {
        setEntries((data || []).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()))
      })
      .catch(() => {})
    if (job.square_invoice_id) {
      fetch('/api/invoices').then(r => r.json()).then((invs: Invoice[]) => {
        setInvoice((invs || []).find(i => i.square_invoice_id === job.square_invoice_id) || null)
      }).catch(() => {})
    }
  }, [job.id, job.square_invoice_id])

  useEffect(() => {
    if (editing) {
      fetch('/api/clients').then(r => r.json()).then(d => setClients(d || [])).catch(() => {})
      fetch('/api/properties').then(r => r.json()).then(d => setAllProperties(d || [])).catch(() => {})
    }
  }, [editing])

  const billableMinutes = entries.filter(e => e.billable).reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const billedAmount = entries.filter(e => e.billable).reduce((s, e) => s + (e.billable_amount || 0), 0)
  const effectiveRate = billableMinutes > 0 ? billedAmount / (billableMinutes / 60) : 0

  const client = job.client
  const property = job.property

  const handleDelete = async () => {
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs?id=${job.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Delete failed') }
      onUpdated?.()
    } catch (e) { setError(e instanceof Error ? e.message : 'Delete failed') }
    setUpdating(false)
  }

  const handleMarkComplete = async () => {
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, status: 'complete', completed_at: new Date().toISOString() }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Update failed') }
      onUpdated?.()
    } catch (e) { setError(e instanceof Error ? e.message : 'Update failed') }
    setUpdating(false)
  }

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) { setError('Title is required'); return }
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: job.id,
          title: editForm.title.trim(),
          description: editForm.description || null,
          client_id: editForm.client_id || null,
          property_id: editForm.property_id || null,
          hourly_rate: editForm.hourly_rate ? Number(editForm.hourly_rate) : null,
          status: editForm.status,
          scheduled_date: editForm.scheduled_date || null,
          is_recurring: editForm.is_recurring,
          recurrence: editForm.is_recurring ? editForm.recurrence : null,
          notes: editForm.notes || null,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Save failed') }
      onUpdated?.()
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed') }
    setUpdating(false)
  }

  const filteredProperties = allProperties.filter(p => p.client_id === editForm.client_id)
  const inputClass = 'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500'

  const invStatusColor: Record<string, string> = {
    paid: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    sent: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
    overdue: 'text-red-400 bg-red-500/15 border-red-500/30',
    draft: 'text-slate-400 bg-slate-500/15 border-slate-500/30',
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div>
          <button onClick={() => setEditing(false)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4">
            <X className="w-4 h-4" /> Cancel editing
          </button>
          <h2 className="text-xl font-bold text-white">Edit Job</h2>
        </div>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Title *</label>
            <input type="text" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Description</label>
            <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Client</label>
              <select value={editForm.client_id} onChange={e => setEditForm(f => ({ ...f, client_id: e.target.value, property_id: '' }))} className={inputClass}>
                <option value="">— Select —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Property</label>
              <select value={editForm.property_id} onChange={e => setEditForm(f => ({ ...f, property_id: e.target.value }))} disabled={!editForm.client_id} className={`${inputClass} disabled:opacity-40`}>
                <option value="">— Select —</option>
                {filteredProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Hourly Rate</label>
              <input type="number" value={editForm.hourly_rate} onChange={e => setEditForm(f => ({ ...f, hourly_rate: e.target.value }))} min="0" step="5" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Status</label>
              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className={inputClass}>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Scheduled Date</label>
              <input type="date" value={editForm.scheduled_date} onChange={e => setEditForm(f => ({ ...f, scheduled_date: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editForm.is_recurring} onChange={e => setEditForm(f => ({ ...f, is_recurring: e.target.checked }))} className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0" />
              <span className="text-sm text-slate-300">Recurring job</span>
            </label>
            {editForm.is_recurring && (
              <select value={editForm.recurrence} onChange={e => setEditForm(f => ({ ...f, recurrence: e.target.value }))} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={`${inputClass} resize-none`} />
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
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to all jobs
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-white">{job.title}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(job.status)}`}>{job.status.replace('_', ' ')}</span>
              {job.is_recurring && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-violet-500/20 text-violet-400 border-violet-500/30">
                  <Repeat className="w-3 h-3" /> {job.recurrence || 'Recurring'}
                </span>
              )}
            </div>
            {job.description && <p className="text-sm text-slate-400 max-w-xl">{job.description}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>
            {job.status !== 'complete' && (
              <button onClick={handleMarkComplete} disabled={updating}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                <CheckCircle className="w-4 h-4" /> Mark Complete
              </button>
            )}
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Delete this job?</span>
                <button onClick={handleDelete} disabled={updating} className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50">Confirm</button>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 text-sm transition-colors">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/30 text-sm font-medium transition-colors flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

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
        {job.scheduled_date && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" />Scheduled</p>
            <p className="text-sm font-medium text-slate-200">{new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        )}
      </div>

      {invoice && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><ExternalLink className="w-4 h-4 text-slate-400" />Linked Invoice</h3>
          <div className="flex flex-wrap items-center gap-6">
            <div><p className="text-xs text-slate-500">Invoice #</p><p className="text-sm font-mono text-slate-300">{invoice.invoice_number}</p></div>
            <div><p className="text-xs text-slate-500">Total</p><p className="text-sm font-medium text-white">{formatCurrency(invoice.total)}</p></div>
            {invoice.square_invoice_id && <div><p className="text-xs text-slate-500">Square ID</p><p className="text-sm font-mono text-slate-400">{invoice.square_invoice_id}</p></div>}
            <div><p className="text-xs text-slate-500">Due</p><p className="text-sm text-slate-300">{invoice.due_date || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Status</p><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${invStatusColor[invoice.status] || ''}`}>{invoice.status}</span></div>
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
