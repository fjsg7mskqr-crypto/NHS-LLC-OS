'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import EquipmentList from './EquipmentList'
import CreateEquipmentModal from './CreateEquipmentModal'
import ErrorBanner from '@/components/ui/ErrorBanner'
import type { Equipment } from '@/types'

export default function EquipmentTab() {
  const [showCreate, setShowCreate] = useState(false)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [listKey, setListKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/equipment')
      .then(r => { if (!r.ok) throw new Error('Failed to load equipment'); return r.json() })
      .then((data: Equipment[]) => setEquipment(data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [listKey])

  const needsRepair = equipment.filter(e => e.condition === 'needs_repair').length
  const locations = new Set(equipment.map(e => e.location))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Equipment</h1>
          <p className="text-sm text-slate-500">{loading ? 'Loading...' : `${equipment.length} items`}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Equipment
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
        <div className="metric-card metric-card--emerald rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Items</p>
          <p className="text-lg font-semibold text-emerald-400 glow-emerald">{equipment.length}</p>
        </div>
        <div className="metric-card metric-card--red rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Needs Repair</p>
          <p className="text-lg font-semibold text-red-400 glow-red">{needsRepair}</p>
        </div>
        <div className="metric-card metric-card--blue rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Locations</p>
          <p className="text-lg font-semibold text-blue-400 glow-blue">{locations.size}</p>
        </div>
        <div className="metric-card metric-card--amber rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">In Truck</p>
          <p className="text-lg font-semibold text-amber-400 glow-amber">{equipment.filter(e => e.location === 'in_truck').length}</p>
        </div>
      </div>

      <EquipmentList
        equipment={equipment}
        loading={loading}
        onUpdated={() => setListKey(k => k + 1)}
      />

      {showCreate && (
        <CreateEquipmentModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); setListKey(k => k + 1) }}
        />
      )}
    </div>
  )
}
