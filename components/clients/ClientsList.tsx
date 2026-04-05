'use client'

import { useState } from 'react'
import { Search, ArrowUpRight, Users, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Client } from '@/types'

export default function ClientsList({
  clients,
  propertyCounts,
  jobCounts,
  loading,
  onSelect,
}: {
  clients: Client[]
  propertyCounts: Record<string, number>
  jobCounts: Record<string, number>
  loading: boolean
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState('')

  const filtered = clients.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    )
  })

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">Phone</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden lg:table-cell">Default Rate</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide"># Properties</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide"># Jobs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map(client => (
              <tr
                key={client.id}
                onClick={() => onSelect(client.id)}
                className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                      {client.name}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" />
                  </div>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <span className="text-sm text-slate-400">{client.email || '—'}</span>
                </td>
                <td className="px-4 py-3.5 hidden sm:table-cell">
                  <span className="text-sm text-slate-400">{client.phone || '—'}</span>
                </td>
                <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                  <span className="text-sm text-slate-200">{formatCurrency(client.default_hourly_rate)}</span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="text-sm text-slate-400">{propertyCounts[client.id] || 0}</span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="text-sm text-slate-400">{jobCounts[client.id] || 0}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="py-12 text-center text-slate-500 text-sm">Loading clients...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-700 empty-state-icon" />
            {search ? 'No clients match your search' : 'No clients yet'}
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-t border-slate-800">
        <p className="text-xs text-slate-600">{filtered.length} clients shown</p>
      </div>
    </div>
  )
}
