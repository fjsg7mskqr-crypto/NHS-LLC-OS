'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, Briefcase } from 'lucide-react'
import { statusColor } from '@/lib/utils'

interface JobRow {
  id: string
  title: string
  status: string
  client: { name: string } | null
  property: { name: string } | null
}

export default function ActiveJobsTable() {
  const [jobs, setJobs] = useState<JobRow[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/jobs?status=in_progress').then(r => r.json()),
      fetch('/api/jobs?status=scheduled').then(r => r.json()),
    ]).then(([inProgress, scheduled]) => {
      setJobs([...(inProgress || []), ...(scheduled || [])].slice(0, 10))
    }).catch(() => {})
  }, [])

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">Active Jobs</h2>
          <span className="text-xs text-slate-500">0 jobs</span>
        </div>
        <div className="py-10 text-center text-slate-500 text-sm">
          <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-700 empty-state-icon" />
          No active jobs
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="font-semibold text-white">Active Jobs</h2>
        <span className="text-xs text-slate-500">{jobs.length} jobs</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Job</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Client</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Property</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {jobs.map(job => (
              <tr key={job.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{job.title}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                  </div>
                </td>
                <td className="px-4 py-3.5"><span className="text-sm text-slate-400">{job.client?.name || '—'}</span></td>
                <td className="px-4 py-3.5 hidden md:table-cell"><span className="text-sm text-slate-500">{job.property?.name || '—'}</span></td>
                <td className="px-4 py-3.5 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(job.status)}`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
