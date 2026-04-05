'use client'

import { useState, useEffect, useCallback, useId } from 'react'
import { X } from 'lucide-react'
import ErrorBanner from '@/components/ui/ErrorBanner'

interface EquipmentForm {
  name: string
  type: string
  location: string
  condition: string
  notes: string
}

export default function CreateEquipmentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated?: () => void
}) {
  const titleId = useId()
  const [form, setForm] = useState<EquipmentForm>({
    name: '',
    type: '',
    location: 'home_base',
    condition: 'good',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof EquipmentForm>(key: K, value: EquipmentForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type || null,
          location: form.location,
          condition: form.condition,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to add equipment')
      }
      onCreated?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add equipment')
    }
    setSaving(false)
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 id={titleId} className="font-semibold text-white">Add Equipment</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

          <div>
            <label htmlFor="equip-name" className="block text-xs text-slate-500 mb-1">Name *</label>
            <input id="equip-name" type="text" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Husqvarna 450 Chainsaw" className={inputClass} />
          </div>
          <div>
            <label htmlFor="equip-type" className="block text-xs text-slate-500 mb-1">Type</label>
            <input id="equip-type" type="text" value={form.type} onChange={e => set('type', e.target.value)} placeholder="e.g. Chainsaw, Mower, Blower" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="equip-location" className="block text-xs text-slate-500 mb-1">Location</label>
              <select id="equip-location" value={form.location} onChange={e => set('location', e.target.value)} className={inputClass}>
                <option value="home_base">Home Base</option>
                <option value="den">Den</option>
                <option value="lodge">Lodge</option>
                <option value="in_truck">In Truck</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="equip-condition" className="block text-xs text-slate-500 mb-1">Condition</label>
              <select id="equip-condition" value={form.condition} onChange={e => set('condition', e.target.value)} className={inputClass}>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="needs_repair">Needs Repair</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="equip-notes" className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea id="equip-notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Serial number, maintenance schedule..." className={`${inputClass} resize-none`} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Add Equipment'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
