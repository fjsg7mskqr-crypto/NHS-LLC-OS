'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { MOCK_CLIENTS, MOCK_PROPERTIES } from '@/lib/mock-data'

export default function CreateJobModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', clientId: '', propertyId: '', targetRate: '', status: 'active' })
  const clientProperties = MOCK_PROPERTIES.filter(p => p.client_id === form.clientId)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Create New Job</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (!form.title.trim()) return; alert('Job created (demo mode)'); onClose() }} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Job Title *</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Spring Lawn Maintenance" required className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Describe the scope of work..." className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Client</label>
              <select value={form.clientId} onChange={e => { set('clientId', e.target.value); set('propertyId', '') }} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                <option value="">— Select —</option>
                {MOCK_CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Property</label>
              <select value={form.propertyId} onChange={e => set('propertyId', e.target.value)} disabled={!form.clientId} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-40">
                <option value="">— Select —</option>
                {clientProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Target Rate ($/hr)</label>
              <input type="number" value={form.targetRate} onChange={e => set('targetRate', e.target.value)} placeholder="e.g. 85" min="0" step="5" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                <option value="active">Active</option>
                <option value="complete">Complete</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors">Create Job</button>
          </div>
        </form>
      </div>
    </div>
  )
}
