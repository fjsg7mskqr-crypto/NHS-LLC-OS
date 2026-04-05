'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { formatCurrency, formatHours } from '@/lib/utils'
import type { Job, TimeEntry } from '@/types'

interface JobProfit {
  id: string; title: string; client_name: string; target_rate: number
  billable_hours: number; total_hours: number; billed_amount: number
  effective_rate: number; low_rate_flag: boolean; status: string
}
interface ClientProfit { id: string; name: string; hours: number; billed: number; effective_rate: number }

export default function ProfitabilityTables() {
  const [jobs, setJobs] = useState<JobProfit[]>([])
  const [clients, setClients] = useState<ClientProfit[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/jobs').then(r => r.json()),
      fetch('/api/time-entries').then(r => r.json()),
    ]).then(([allJobs, allEntries]: [Job[], TimeEntry[]]) => {
      const entriesByJob: Record<string, TimeEntry[]> = {}
      const entriesByClient: Record<string, TimeEntry[]> = {}

      for (const entry of (allEntries || [])) {
        if (entry.job_id) {
          if (!entriesByJob[entry.job_id]) entriesByJob[entry.job_id] = []
          entriesByJob[entry.job_id].push(entry)
        }
        if (entry.client_id) {
          if (!entriesByClient[entry.client_id]) entriesByClient[entry.client_id] = []
          entriesByClient[entry.client_id].push(entry)
        }
      }

      const computed = (allJobs || [])
        .filter(j => j.status !== 'cancelled')
        .map(j => {
          const jobEntries = entriesByJob[j.id] || []
          const totalMinutes = jobEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0)
          const billableMinutes = jobEntries.filter(e => e.billable).reduce((s, e) => s + (e.duration_minutes || 0), 0)
          const billedAmount = jobEntries.reduce((s, e) => s + (e.billable_amount || 0), 0)
          const totalHours = totalMinutes / 60
          const billableHours = billableMinutes / 60
          const targetRate = j.hourly_rate || j.client?.default_hourly_rate || 0
          const effectiveRate = billableHours > 0 ? billedAmount / billableHours : 0
          const lowRateFlag = targetRate > 0 && billableHours > 0 && effectiveRate < targetRate * 0.8

          return {
            id: j.id,
            title: j.title,
            client_name: j.client?.name || 'Unknown',
            target_rate: targetRate,
            billable_hours: billableHours,
            total_hours: totalHours,
            billed_amount: billedAmount,
            effective_rate: effectiveRate,
            low_rate_flag: lowRateFlag,
            status: j.status,
          }
        })
      setJobs(computed)

      // Derive client profitability
      const clientMap: Record<string, ClientProfit> = {}
      for (const j of (allJobs || [])) {
        if (!j.client) continue
        if (!clientMap[j.client.id]) {
          clientMap[j.client.id] = { id: j.client.id, name: j.client.name, hours: 0, billed: 0, effective_rate: 0 }
        }
      }
      for (const [clientId, entries] of Object.entries(entriesByClient)) {
        if (!clientMap[clientId]) continue
        const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0)
        const billedAmount = entries.reduce((s, e) => s + (e.billable_amount || 0), 0)
        const hours = totalMinutes / 60
        clientMap[clientId].hours = hours
        clientMap[clientId].billed = billedAmount
        clientMap[clientId].effective_rate = hours > 0 ? billedAmount / hours : 0
      }
      setClients(Object.values(clientMap))
    }).catch(() => {})
  }, [])

  const totalClientHours = clients.reduce((s, c) => s + c.hours, 0)

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-white">Job Profitability</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Job</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Hours</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Rate</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Billed</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">$/hr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {jobs.map(job => (
                <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3"><p className="text-sm text-slate-200">{job.title}</p><p className="text-xs text-slate-500">{job.client_name}</p></td>
                  <td className="px-4 py-3 text-right"><span className="text-sm font-mono text-slate-300">{formatHours(job.total_hours)}</span></td>
                  <td className="px-4 py-3 text-right"><span className="text-sm text-slate-400">{job.target_rate ? `$${job.target_rate}` : '\u2014'}</span></td>
                  <td className="px-4 py-3 text-right"><span className="text-sm font-medium text-emerald-400">{job.billed_amount > 0 ? formatCurrency(job.billed_amount) : '\u2014'}</span></td>
                  <td className="px-4 py-3 text-center">
                    {job.billable_hours > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <span className={`text-sm font-semibold ${job.low_rate_flag ? 'text-red-400' : 'text-slate-200'}`}>${job.effective_rate.toFixed(0)}</span>
                        {job.low_rate_flag && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                    ) : <span className="text-slate-600">{'\u2014'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-800">
          <p className="text-xs text-slate-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-400" />Red flag = effective rate &gt;20% below target</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-white">Client Profitability</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Client</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Hours</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Billed</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Eff. Rate</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">% Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {clients.map(client => {
                const pct = totalClientHours > 0 ? (client.hours / totalClientHours) * 100 : 0
                return (
                  <tr key={client.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3"><span className="text-sm text-slate-200">{client.name}</span></td>
                    <td className="px-4 py-3 text-right"><span className="text-sm font-mono text-slate-300">{formatHours(client.hours)}</span></td>
                    <td className="px-4 py-3 text-right"><span className="text-sm font-medium text-emerald-400">{client.billed > 0 ? formatCurrency(client.billed) : '\u2014'}</span></td>
                    <td className="px-4 py-3 text-right"><span className="text-sm text-slate-300">{client.effective_rate > 0 ? `$${client.effective_rate.toFixed(0)}/hr` : '\u2014'}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                        <span className="text-xs text-slate-500 w-8">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
