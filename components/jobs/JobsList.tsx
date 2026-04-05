'use client'

import { useState, useEffect } from 'react'
import { Search, ChevronDown, ArrowUpRight, Briefcase } from 'lucide-react'
import { statusColor } from '@/lib/utils'
import type { Client, Job, JobStatus } from '@/types'

export default function JobsList({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => {
    fetch('/api/jobs').then(r => r.json()).then(data => setAllJobs(data || [])).catch(() => {})
    fetch('/api/clients').then(r => r.json()).then(data => setClients(data || [])).catch(() => {})
  }, [])

  const filtered = allJobs.filter(job => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false
    if (clientFilter !== 'all' && job.client_id !== clientFilter) return false
    if (
      search &&
      !job.title.toLowerCase().includes(search.toLowerCase()) &&
      !job.client?.name?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }
    return true
  })

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as JobStatus | 'all')} className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer">
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer">
            <option value="all">All Clients</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Job</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Client / Property</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">Rate</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map(job => (
              <tr key={job.id} onClick={() => onSelect(job.id)} className="hover:bg-slate-800/40 transition-colors cursor-pointer group">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{job.title}</p>
                      {job.description && <p className="text-xs text-slate-600 mt-0.5 truncate max-w-xs">{job.description}</p>}
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" />
                  </div>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell"><p className="text-sm text-slate-400">{job.client?.name}</p><p className="text-xs text-slate-600">{job.property?.name}</p></td>
                <td className="px-4 py-3.5 text-right hidden sm:table-cell"><span className="text-sm text-slate-400">{job.hourly_rate ? `$${job.hourly_rate}/hr` : job.client?.default_hourly_rate ? `$${job.client.default_hourly_rate}/hr` : '—'}</span></td>
                <td className="px-4 py-3.5 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(job.status)}`}>{job.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-slate-500 text-sm"><Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-700 empty-state-icon" />No jobs match your filters</div>}
      </div>
      <div className="px-5 py-3 border-t border-slate-800"><p className="text-xs text-slate-600">{filtered.length} jobs shown</p></div>
    </div>
  )
}
