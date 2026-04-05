'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Pencil, Trash2, X, Plus, MapPin, Briefcase, FileText } from 'lucide-react'
import { formatCurrency, formatDate, statusColor, invoiceStatusColor } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'
import CreatePropertyModal from './CreatePropertyModal'
import type { Client, Property, Job, Invoice } from '@/types'

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  vacation_rental: 'Vacation Rental',
  other: 'Other',
}

export default function ClientDetail({
  client,
  onBack,
  onUpdated,
}: {
  client: Client
  onBack: () => void
  onUpdated: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddProperty, setShowAddProperty] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [confirmDeletePropId, setConfirmDeletePropId] = useState<string | null>(null)

  const [properties, setProperties] = useState<Property[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  const [editForm, setEditForm] = useState({
    name: client.name,
    contact_name: client.contact_name || '',
    email: client.email || '',
    phone: client.phone || '',
    default_hourly_rate: String(client.default_hourly_rate),
    billable_drive_time: client.billable_drive_time ?? false,
    notes: client.notes || '',
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/properties?client_id=${client.id}`).then(r => r.json()),
      fetch('/api/jobs').then(r => r.json()),
      fetch(`/api/invoices?client_id=${client.id}`).then(r => r.json()),
    ]).then(([props, allJobs, invs]) => {
      setProperties(props || [])
      setJobs((allJobs || []).filter((j: Job) => j.client_id === client.id))
      setInvoices(invs || [])
    }).catch(() => {})
  }, [client.id])

  const handleDelete = async () => {
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients?id=${client.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Delete failed') }
      onUpdated()
    } catch (e) { setError(e instanceof Error ? e.message : 'Delete failed') }
    setUpdating(false)
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      setError('Client name is required')
      return
    }
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: client.id,
          name: editForm.name.trim(),
          contact_name: editForm.contact_name || null,
          email: editForm.email || null,
          phone: editForm.phone || null,
          default_hourly_rate: Number(editForm.default_hourly_rate) || 0,
          billable_drive_time: editForm.billable_drive_time,
          notes: editForm.notes || null,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Save failed') }
      onUpdated()
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed') }
    setUpdating(false)
  }

  const handleDeleteProperty = async (id: string) => {
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch(`/api/properties?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Delete failed') }
      setConfirmDeletePropId(null)
      setProperties(prev => prev.filter(p => p.id !== id))
    } catch (e) { setError(e instanceof Error ? e.message : 'Delete failed') }
    setUpdating(false)
  }

  const refreshProperties = () => {
    fetch(`/api/properties?client_id=${client.id}`).then(r => r.json()).then(d => setProperties(d || [])).catch(() => {})
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500'

  const outstandingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue')
  const recentJobs = jobs.slice(0, 5)

  if (editing) {
    return (
      <div className="space-y-6">
        <div>
          <button onClick={() => setEditing(false)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4">
            <X className="w-4 h-4" /> Cancel editing
          </button>
          <h2 className="text-xl font-bold text-white">Edit Client</h2>
        </div>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Name *</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Contact Name</label>
              <input type="text" value={editForm.contact_name} onChange={e => setEditForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Who you deal with" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Email</label>
              <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Phone</label>
              <input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Default Hourly Rate</label>
              <input type="number" value={editForm.default_hourly_rate} onChange={e => setEditForm(f => ({ ...f, default_hourly_rate: e.target.value }))} min="0" step="0.01" className={inputClass} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors w-full">
                <input type="checkbox" checked={editForm.billable_drive_time} onChange={e => setEditForm(f => ({ ...f, billable_drive_time: e.target.checked }))} className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0" />
                <span className="text-sm text-slate-300">Bill drive time</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
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
          <ArrowLeft className="w-4 h-4" /> Back to all clients
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">{client.name}</h2>
            <div className="flex flex-wrap gap-3 text-sm text-slate-400">
              {client.email && <span>{client.email}</span>}
              {client.phone && <span>{client.phone}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Delete this client{jobs.length > 0 ? ` and archive ${jobs.length} job${jobs.length > 1 ? 's' : ''}` : ''}?</span>
                <button onClick={handleDelete} disabled={updating} className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50">Confirm</button>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 text-sm transition-colors">Cancel</button>
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

      {/* Client info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Default Rate</p>
          <p className="text-lg font-semibold text-emerald-400">{formatCurrency(client.default_hourly_rate)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Properties</p>
          <p className="text-lg font-semibold text-blue-400">{properties.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Jobs</p>
          <p className="text-lg font-semibold text-slate-200">{jobs.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Outstanding Invoices</p>
          <p className="text-lg font-semibold text-amber-400">{outstandingInvoices.length}</p>
        </div>
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-2">Notes</h3>
          <p className="text-sm text-slate-400 whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {/* Properties */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-white">Properties</h3>
          <button
            onClick={() => setShowAddProperty(true)}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Property
          </button>
        </div>
        {properties.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-sm">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-700 empty-state-icon" />
            No properties yet
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Address</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {properties.map(prop => (
                <tr key={prop.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-200">{prop.name}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-400 hidden md:table-cell">{prop.address || '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-500/20 text-slate-400 border-slate-500/30">
                      {PROPERTY_TYPE_LABELS[prop.type] || prop.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {confirmDeletePropId === prop.id ? (
                      <div className="flex justify-end items-center gap-1">
                        <button onClick={() => handleDeleteProperty(prop.id)} disabled={updating} className="px-2 py-1 rounded text-xs bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 disabled:opacity-50">Delete</button>
                        <button onClick={() => setConfirmDeletePropId(null)} className="px-2 py-1 rounded text-xs border border-slate-700 text-slate-400 hover:text-slate-200">No</button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditingProperty(prop)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmDeletePropId(prop.id)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Jobs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">Recent Jobs</h3>
        </div>
        {recentJobs.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-sm">
            <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-700 empty-state-icon" />
            No jobs yet
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">Created</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {recentJobs.map(job => (
                <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-200">{job.title}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-400 hidden sm:table-cell">{formatDate(job.created_at.slice(0, 10))}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(job.status)}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Outstanding Invoices */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">Outstanding Invoices</h3>
        </div>
        {outstandingInvoices.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-700 empty-state-icon" />
            No outstanding invoices
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Invoice #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">Due Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {outstandingInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-200">{inv.invoice_number}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-400 hidden sm:table-cell">{formatDate(inv.due_date)}</td>
                  <td className="px-4 py-3.5 text-sm font-medium text-slate-200 text-right">{formatCurrency(inv.total)}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${invoiceStatusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddProperty && (
        <CreatePropertyModal
          clientId={client.id}
          onClose={() => setShowAddProperty(false)}
          onCreated={() => { setShowAddProperty(false); refreshProperties() }}
        />
      )}

      {editingProperty && (
        <CreatePropertyModal
          clientId={client.id}
          property={editingProperty}
          onClose={() => setEditingProperty(null)}
          onCreated={() => { setEditingProperty(null); refreshProperties() }}
        />
      )}
    </div>
  )
}
