'use client'

import { useState, useEffect, useCallback, useId } from 'react'
import { X } from 'lucide-react'
import ErrorBanner from '@/components/ui/ErrorBanner'
import type { Property } from '@/types'

interface BlockForm {
  property_id: string
  type: string
  start_date: string
  end_date: string
  notes: string
}

export default function CreateBlockModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated?: () => void
}) {
  const titleId = useId()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<BlockForm>({
    property_id: '',
    type: 'job_day',
    start_date: today,
    end_date: today,
    notes: '',
  })
  const [properties, setProperties] = useState<Property[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof BlockForm>(key: K, value: BlockForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  useEffect(() => {
    fetch('/api/properties').then(r => r.json()).then(d => setProperties(d || [])).catch(() => {})
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.start_date || !form.end_date) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/calendar-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: form.property_id || null,
          type: form.type,
          start_date: form.start_date,
          end_date: form.end_date,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to create block')
      }
      onCreated?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create block')
    }
    setSaving(false)
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 id={titleId} className="font-semibold text-white">Add Calendar Block</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

          <div>
            <label htmlFor="block-type" className="block text-xs text-slate-500 mb-1">Type *</label>
            <select id="block-type" value={form.type} onChange={e => set('type', e.target.value)} className={inputClass}>
              <option value="job_day">Job Day</option>
              <option value="sbr_booking">SBR Booking</option>
            </select>
          </div>
          <div>
            <label htmlFor="block-property" className="block text-xs text-slate-500 mb-1">Property</label>
            <select id="block-property" value={form.property_id} onChange={e => set('property_id', e.target.value)} className={inputClass}>
              <option value="">— No property —</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}{p.client ? ` (${p.client.name})` : ''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="block-start" className="block text-xs text-slate-500 mb-1">Start Date *</label>
              <input id="block-start" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="block-end" className="block text-xs text-slate-500 mb-1">End Date *</label>
              <input id="block-end" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} required className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="block-notes" className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea id="block-notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Additional details..." className={`${inputClass} resize-none`} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Add Block'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
