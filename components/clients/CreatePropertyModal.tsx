'use client'

import { useState, useEffect, useCallback, useId } from 'react'
import { X } from 'lucide-react'
import ErrorBanner from '@/components/ui/ErrorBanner'

interface PropertyForm {
  name: string
  address: string
  type: string
  notes: string
}

export default function CreatePropertyModal({
  clientId,
  onClose,
  onCreated,
}: {
  clientId: string
  onClose: () => void
  onCreated?: () => void
}) {
  const titleId = useId()
  const [form, setForm] = useState<PropertyForm>({
    name: '',
    address: '',
    type: 'residential',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof PropertyForm>(key: K, value: PropertyForm[K]) =>
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
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          name: form.name.trim(),
          address: form.address || null,
          type: form.type,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to create property')
      }
      onCreated?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create property')
    }
    setSaving(false)
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 id={titleId} className="font-semibold text-white">Add Property</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

          <div>
            <label htmlFor="prop-name" className="block text-xs text-slate-500 mb-1">Property Name *</label>
            <input id="prop-name" type="text" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Main Residence, North Lot" className={inputClass} />
          </div>
          <div>
            <label htmlFor="prop-address" className="block text-xs text-slate-500 mb-1">Address</label>
            <input id="prop-address" type="text" value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, Bozeman, MT" className={inputClass} />
          </div>
          <div>
            <label htmlFor="prop-type" className="block text-xs text-slate-500 mb-1">Type</label>
            <select id="prop-type" value={form.type} onChange={e => set('type', e.target.value)} className={inputClass}>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="vacation_rental">Vacation Rental</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="prop-notes" className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea id="prop-notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Gate codes, access instructions..." className={`${inputClass} resize-none`} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Add Property'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
