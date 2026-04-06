'use client'

import { useState, useEffect, useCallback, useId } from 'react'
import { X } from 'lucide-react'
import ErrorBanner from '@/components/ui/ErrorBanner'
import type { Client, Job, Priority, Property } from '@/types'

interface TaskForm {
  title: string
  priority: Priority
  due_date: string
  client_id: string
  property_id: string
  job_id: string
}

export default function CreateTaskModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated?: () => void
}) {
  const titleId = useId()
  const [form, setForm] = useState<TaskForm>({
    title: '',
    priority: 'medium',
    due_date: '',
    client_id: '',
    property_id: '',
    job_id: '',
  })
  const [clients, setClients] = useState<Client[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof TaskForm>(key: K, value: TaskForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

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

  const clientProperties = properties.filter(p => p.client_id === form.client_id)
  const clientJobs = jobs.filter(j => j.client_id === form.client_id && j.status !== 'cancelled')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          priority: form.priority,
          due_date: form.due_date || null,
          client_id: form.client_id || null,
          property_id: form.property_id || null,
          job_id: form.job_id || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to create task')
      }
      onCreated?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create task')
    }
    setSaving(false)
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 id={titleId} className="font-semibold text-white">New Task</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

          <div>
            <label htmlFor="task-title" className="block text-xs text-slate-500 mb-1">Title *</label>
            <input id="task-title" type="text" value={form.title} onChange={e => set('title', e.target.value)} required placeholder="What needs to be done?" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-priority" className="block text-xs text-slate-500 mb-1">Priority</label>
              <select id="task-priority" value={form.priority} onChange={e => set('priority', e.target.value as Priority)} className={inputClass}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label htmlFor="task-due" className="block text-xs text-slate-500 mb-1">Due Date</label>
              <input id="task-due" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="task-client" className="block text-xs text-slate-500 mb-1">Client</label>
            <select id="task-client" value={form.client_id} onChange={e => { set('client_id', e.target.value); set('property_id', ''); set('job_id', '') }} className={inputClass}>
              <option value="">— None —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {form.client_id && (
            <div className="grid grid-cols-2 gap-3">
              {clientProperties.length > 0 && (
                <div>
                  <label htmlFor="task-property" className="block text-xs text-slate-500 mb-1">Property</label>
                  <select id="task-property" value={form.property_id} onChange={e => set('property_id', e.target.value)} className={inputClass}>
                    <option value="">— None —</option>
                    {clientProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="task-job" className="block text-xs text-slate-500 mb-1">Job</label>
                <select id="task-job" value={form.job_id} onChange={e => set('job_id', e.target.value)} className={inputClass}>
                  <option value="">— None —</option>
                  {clientJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
