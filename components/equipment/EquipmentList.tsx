'use client'

import { useState } from 'react'
import { Search, ChevronDown, Wrench, Pencil, Trash2, X, Check } from 'lucide-react'
import ErrorBanner from '@/components/ui/ErrorBanner'
import type { Equipment } from '@/types'

const LOCATION_LABELS: Record<string, string> = {
  home_base: 'Home Base',
  den: 'Den',
  lodge: 'Lodge',
  in_truck: 'In Truck',
  other: 'Other',
}

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  needs_repair: 'Needs Repair',
}

function conditionColor(condition: string): string {
  switch (condition) {
    case 'excellent': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'good': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'fair': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'needs_repair': return 'bg-red-500/20 text-red-400 border-red-500/30'
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }
}

export default function EquipmentList({
  equipment,
  loading,
  onUpdated,
}: {
  equipment: Equipment[]
  loading: boolean
  onUpdated: () => void
}) {
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [conditionFilter, setConditionFilter] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', type: '', location: '', condition: '', notes: '' })
  const [updating, setUpdating] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filtered = equipment.filter(item => {
    if (locationFilter !== 'all' && item.location !== locationFilter) return false
    if (conditionFilter !== 'all' && item.condition !== conditionFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!item.name.toLowerCase().includes(q) && !(item.type || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const startEdit = (item: Equipment) => {
    setEditingId(item.id)
    setEditForm({
      name: item.name,
      type: item.type || '',
      location: item.location,
      condition: item.condition,
      notes: item.notes || '',
    })
  }

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim()) { setError('Name is required'); return }
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch('/api/equipment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: editForm.name.trim(),
          type: editForm.type || null,
          location: editForm.location,
          condition: editForm.condition,
          notes: editForm.notes || null,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Save failed') }
      setEditingId(null)
      onUpdated()
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed') }
    setUpdating(false)
  }

  const handleDelete = async (id: string) => {
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch(`/api/equipment?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Delete failed') }
      setConfirmDeleteId(null)
      onUpdated()
    } catch (e) { setError(e instanceof Error ? e.message : 'Delete failed') }
    setUpdating(false)
  }

  const inputClass = 'px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500'

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      {error && <div className="px-5 pt-4"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}
      <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search equipment..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="relative">
          <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer">
            <option value="all">All Locations</option>
            {Object.entries(LOCATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={conditionFilter} onChange={e => setConditionFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer">
            <option value="all">All Conditions</option>
            {Object.entries(CONDITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Location</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Condition</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden lg:table-cell">Notes</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                {editingId === item.id ? (
                  <>
                    <td className="px-5 py-2"><input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={`${inputClass} w-full`} /></td>
                    <td className="px-4 py-2 hidden md:table-cell"><input type="text" value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} className={`${inputClass} w-full`} /></td>
                    <td className="px-4 py-2">
                      <select value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} className={`${inputClass} w-full`}>
                        {Object.entries(LOCATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select value={editForm.condition} onChange={e => setEditForm(f => ({ ...f, condition: e.target.value }))} className={`${inputClass} w-full`}>
                        {Object.entries(CONDITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2 hidden lg:table-cell"><input type="text" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className={`${inputClass} w-full`} /></td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => saveEdit(item.id)} disabled={updating} className="p-1.5 rounded-lg hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-200">{item.name}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-400 hidden md:table-cell">{item.type || '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-400">{LOCATION_LABELS[item.location] || item.location}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${conditionColor(item.condition)}`}>
                        {CONDITION_LABELS[item.condition] || item.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500 hidden lg:table-cell truncate max-w-xs">{item.notes || '—'}</td>
                    <td className="px-4 py-3.5 text-right">
                      {confirmDeleteId === item.id ? (
                        <div className="flex justify-end items-center gap-1">
                          <button onClick={() => handleDelete(item.id)} disabled={updating} className="px-2 py-1 rounded text-xs bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 disabled:opacity-50">Delete</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 rounded text-xs border border-slate-700 text-slate-400 hover:text-slate-200">No</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setConfirmDeleteId(item.id)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="py-12 text-center text-slate-500 text-sm">Loading equipment...</div>}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">
            <Wrench className="w-8 h-8 mx-auto mb-2 text-slate-700 empty-state-icon" />
            {search || locationFilter !== 'all' || conditionFilter !== 'all' ? 'No equipment matches your filters' : 'No equipment yet'}
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-t border-slate-800">
        <p className="text-xs text-slate-600">{filtered.length} items shown</p>
      </div>
    </div>
  )
}
