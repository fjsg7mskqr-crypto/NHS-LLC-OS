'use client'

import { useState, useEffect, useCallback, useId } from 'react'
import { X } from 'lucide-react'
import { CATEGORY_LABELS } from '@/lib/utils'
import { format } from 'date-fns'
import ErrorBanner from '@/components/ui/ErrorBanner'
import type { CategoryType, Client, Job, Property, TimeEntry } from '@/types'

const CATEGORIES: CategoryType[] = ['client_work', 'drive_time', 'prep', 'admin', 'equipment_maint']

interface TimeEntryFormState {
  date: string
  startTime: string
  endTime: string
  category: CategoryType
  clientId: string
  propertyId: string
  jobId: string
  notes: string
  billable: boolean
}

export default function TimeEntryForm({
  entry,
  onClose,
  onSaved,
}: {
  entry?: TimeEntry
  onClose: () => void
  onSaved?: () => void
}) {
  const titleId = useId()
  const isEdit = !!entry
  const today = format(new Date(), 'yyyy-MM-dd')

  const [form, setForm] = useState<TimeEntryFormState>(() => {
    if (entry) {
      const startDate = new Date(entry.start_time)
      const endDate = entry.end_time ? new Date(entry.end_time) : null
      return {
        date: format(startDate, 'yyyy-MM-dd'),
        startTime: format(startDate, 'HH:mm'),
        endTime: endDate ? format(endDate, 'HH:mm') : '11:00',
        category: entry.category as CategoryType,
        clientId: entry.client_id || '',
        propertyId: entry.property_id || '',
        jobId: entry.job_id || '',
        notes: entry.notes || '',
        billable: entry.billable,
      }
    }
    return {
      date: today,
      startTime: '09:00',
      endTime: '11:00',
      category: 'client_work',
      clientId: '',
      propertyId: '',
      jobId: '',
      notes: '',
      billable: true,
    }
  })
  const [clients, setClients] = useState<Client[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof TimeEntryFormState>(key: K, value: TimeEntryFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d || [])).catch(() => {})
    fetch('/api/properties').then(r => r.json()).then(d => setProperties(d || [])).catch(() => {})
    fetch('/api/jobs').then(r => r.json()).then(d => setJobs(d || [])).catch(() => {})
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const clientProperties = properties.filter(p => p.client_id === form.clientId)
  const activeJobs = jobs.filter(job => job.client_id === form.clientId && job.status !== 'cancelled')
  const selectedClient = clients.find(client => client.id === form.clientId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const startDt = new Date(`${form.date}T${form.startTime}`)
      const endDt = new Date(`${form.date}T${form.endTime}`)
      // Handle cross-midnight: if end is before start, push end to the next day
      if (endDt <= startDt) endDt.setDate(endDt.getDate() + 1)
      const startTime = startDt.toISOString()
      const endTime = endDt.toISOString()
      const billable = form.billable
      const hourlyRate = billable ? (selectedClient?.default_hourly_rate || null) : null

      if (isEdit) {
        const res = await fetch('/api/time-entries', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: entry.id,
            job_id: form.jobId || null,
            client_id: form.clientId || null,
            property_id: form.propertyId || null,
            category: form.category,
            start_time: startTime,
            end_time: endTime,
            billable,
            hourly_rate: hourlyRate,
            notes: form.notes || null,
          }),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error || 'Update failed')
        }
      } else {
        const res = await fetch('/api/clock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: form.jobId || null,
            client_id: form.clientId || null,
            property_id: form.propertyId || null,
            category: form.category,
            start_time: startTime,
            end_time: endTime,
            billable,
            hourly_rate: hourlyRate,
            notes: form.notes || null,
            source: 'manual',
          }),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error || 'Create failed')
        }
      }
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
    setSaving(false)
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 id={titleId} className="font-semibold text-white">{isEdit ? 'Edit Time Entry' : 'Add Time Entry'}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label htmlFor="te-date" className="block text-xs text-slate-500 mb-1">Date</label>
              <input id="te-date" type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="te-start" className="block text-xs text-slate-500 mb-1">Start</label>
              <input id="te-start" type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="te-end" className="block text-xs text-slate-500 mb-1">End</label>
              <input id="te-end" type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="te-category" className="block text-xs text-slate-500 mb-1">Category</label>
            <select id="te-category" value={form.category} onChange={e => set('category', e.target.value as CategoryType)} className={inputClass}>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="te-client" className="block text-xs text-slate-500 mb-1">Client</label>
            <select id="te-client" value={form.clientId} onChange={e => { set('clientId', e.target.value); set('propertyId', ''); set('jobId', '') }} className={inputClass}>
              <option value="">— No client —</option>
              {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </div>
          {form.clientId && clientProperties.length > 0 && (
            <div>
              <label htmlFor="te-property" className="block text-xs text-slate-500 mb-1">Property</label>
              <select id="te-property" value={form.propertyId} onChange={e => set('propertyId', e.target.value)} className={inputClass}>
                <option value="">— No property —</option>
                {clientProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          {form.clientId && (
            <div>
              <label htmlFor="te-job" className="block text-xs text-slate-500 mb-1">Job (optional)</label>
              <select id="te-job" value={form.jobId} onChange={e => set('jobId', e.target.value)} className={inputClass}>
                <option value="">— No job —</option>
                {activeJobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input id="te-billable" type="checkbox" checked={form.billable} onChange={e => set('billable', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0" />
            <label htmlFor="te-billable" className="text-sm text-slate-300">Billable</label>
          </div>
          <div>
            <label htmlFor="te-notes" className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea id="te-notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="What did you work on?" className={`${inputClass} resize-none`} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50">{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Entry'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
