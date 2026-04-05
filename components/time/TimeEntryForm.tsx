'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { CATEGORY_LABELS } from '@/lib/utils'
import { format } from 'date-fns'
import type { CategoryType, Client, Job } from '@/types'

const CATEGORIES: CategoryType[] = ['client_work', 'drive_time', 'errand', 'prep', 'admin', 'equipment_maint']

interface TimeEntryFormState {
  date: string
  startTime: string
  endTime: string
  category: CategoryType
  clientId: string
  jobId: string
  notes: string
  billable: boolean
}

export default function TimeEntryForm({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState<TimeEntryFormState>({
    date: today,
    startTime: '09:00',
    endTime: '11:00',
    category: 'client_work',
    clientId: '',
    jobId: '',
    notes: '',
    billable: true,
  })
  const [clients, setClients] = useState<Client[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof TimeEntryFormState>(key: K, value: TimeEntryFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d || [])).catch(() => {})
    fetch('/api/jobs').then(r => r.json()).then(d => setJobs(d || [])).catch(() => {})
  }, [])

  const activeJobs = jobs.filter(job => job.client_id === form.clientId && job.status !== 'cancelled')
  const selectedClient = clients.find(client => client.id === form.clientId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const startTime = `${form.date}T${form.startTime}:00`
      const endTime = `${form.date}T${form.endTime}:00`
      const billable = form.billable && form.category === 'client_work'
      const res = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: form.jobId || null,
          client_id: form.clientId || null,
          category: form.category,
          start_time: startTime,
          end_time: endTime,
          billable,
          hourly_rate: billable ? (selectedClient?.default_hourly_rate || null) : null,
          notes: form.notes || null,
          source: 'manual',
        }),
      })
      if (res.ok) { onSaved?.(); onClose() }
    } catch {}
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Add Time Entry</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs text-slate-500 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start</label>
              <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">End</label>
              <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value as CategoryType)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Client</label>
            <select value={form.clientId} onChange={e => { set('clientId', e.target.value); set('jobId', '') }} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
              <option value="">— No client —</option>
              {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </div>
          {form.clientId && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Job (optional)</label>
              <select value={form.jobId} onChange={e => set('jobId', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                <option value="">— No job —</option>
                {activeJobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="What did you work on?" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save Entry'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
