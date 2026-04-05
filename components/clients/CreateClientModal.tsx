'use client'

import { useState, useEffect, useCallback, useId } from 'react'
import { X } from 'lucide-react'
import ErrorBanner from '@/components/ui/ErrorBanner'

interface ClientForm {
  name: string
  email: string
  phone: string
  default_hourly_rate: string
  notes: string
}

export default function CreateClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated?: () => void
}) {
  const titleId = useId()
  const [form, setForm] = useState<ClientForm>({
    name: '',
    email: '',
    phone: '',
    default_hourly_rate: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof ClientForm>(key: K, value: ClientForm[K]) =>
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
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email || null,
          phone: form.phone || null,
          default_hourly_rate: Number(form.default_hourly_rate) || 0,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to create client')
      }
      onCreated?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create client')
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
          <h2 id={titleId} className="font-semibold text-white">New Client</h2>
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
            <label htmlFor="client-name" className="block text-xs text-slate-500 mb-1">Name *</label>
            <input id="client-name" type="text" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Client name" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="client-email" className="block text-xs text-slate-500 mb-1">Email</label>
              <input id="client-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" className={inputClass} />
            </div>
            <div>
              <label htmlFor="client-phone" className="block text-xs text-slate-500 mb-1">Phone</label>
              <input id="client-phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(406) 555-0100" className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="client-rate" className="block text-xs text-slate-500 mb-1">Default Hourly Rate</label>
            <input id="client-rate" type="number" value={form.default_hourly_rate} onChange={e => set('default_hourly_rate', e.target.value)} min="0" step="0.01" placeholder="0.00" className={inputClass} />
          </div>
          <div>
            <label htmlFor="client-notes" className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea id="client-notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Additional notes..." className={`${inputClass} resize-none`} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Create Client'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
