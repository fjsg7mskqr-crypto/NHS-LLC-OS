'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import ClientsList from './ClientsList'
import ClientDetail from './ClientDetail'
import CreateClientModal from './CreateClientModal'
import ErrorBanner from '@/components/ui/ErrorBanner'
import { formatCurrency } from '@/lib/utils'
import type { Client, Property, Job } from '@/types'

export default function ClientsTab() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [listKey, setListKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetch('/api/clients').then(r => { if (!r.ok) throw new Error('Failed to load clients'); return r.json() }),
      fetch('/api/properties').then(r => { if (!r.ok) throw new Error('Failed to load properties'); return r.json() }),
      fetch('/api/jobs').then(r => { if (!r.ok) throw new Error('Failed to load jobs'); return r.json() }),
    ])
      .then(([cli, props, jbs]) => {
        setClients(cli || [])
        setProperties(props || [])
        setJobs(jbs || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [listKey])

  const totalClients = clients.length
  const totalProperties = properties.length
  const activeJobs = jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length
  const avgRate = totalClients > 0
    ? clients.reduce((s, c) => s + c.default_hourly_rate, 0) / totalClients
    : 0

  const selectedClient = clients.find(c => c.id === selectedClientId) || null

  const handleSelect = (id: string) => setSelectedClientId(id)
  const handleBack = () => setSelectedClientId(null)
  const handleUpdated = () => {
    setSelectedClientId(null)
    setListKey(k => k + 1)
  }

  // Build counts for list view
  const propertyCounts: Record<string, number> = {}
  const jobCounts: Record<string, number> = {}
  for (const p of properties) {
    propertyCounts[p.client_id] = (propertyCounts[p.client_id] || 0) + 1
  }
  for (const j of jobs) {
    jobCounts[j.client_id] = (jobCounts[j.client_id] || 0) + 1
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Clients</h1>
          <p className="text-sm text-slate-500">{loading ? 'Loading...' : `${totalClients} total`}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> New Client
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
        <div className="metric-card metric-card--emerald rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Clients</p>
          <p className="text-lg font-semibold text-emerald-400 glow-emerald">{totalClients}</p>
        </div>
        <div className="metric-card metric-card--blue rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Properties</p>
          <p className="text-lg font-semibold text-blue-400 glow-blue">{totalProperties}</p>
        </div>
        <div className="metric-card metric-card--amber rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Active Jobs</p>
          <p className="text-lg font-semibold text-amber-400 glow-amber">{activeJobs}</p>
        </div>
        <div className="metric-card metric-card--emerald rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Avg Hourly Rate</p>
          <p className="text-lg font-semibold text-emerald-400 glow-emerald">{formatCurrency(avgRate)}</p>
        </div>
      </div>

      {selectedClient ? (
        <ClientDetail
          key={selectedClient.id}
          client={selectedClient}
          onBack={handleBack}
          onUpdated={handleUpdated}
        />
      ) : (
        <ClientsList
          clients={clients}
          propertyCounts={propertyCounts}
          jobCounts={jobCounts}
          loading={loading}
          onSelect={handleSelect}
        />
      )}

      {showCreate && (
        <CreateClientModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); setListKey(k => k + 1) }}
        />
      )}
    </div>
  )
}
