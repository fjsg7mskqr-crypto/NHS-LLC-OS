'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, Briefcase } from 'lucide-react'
import PanelLite from '@/components/ui/PanelLite'

interface JobRow {
  id: string
  title: string
  status: string
  client: { name: string } | null
  property: { name: string } | null
}

const STATUS_TONE: Record<string, { dot: string; text: string; label: string }> = {
  in_progress: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'In progress' },
  scheduled:   { dot: 'bg-sky-400',     text: 'text-sky-400',     label: 'Scheduled' },
  completed:   { dot: 'bg-slate-600',   text: 'text-slate-500',   label: 'Completed' },
}

export default function ActiveJobsTable() {
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/jobs?status=in_progress').then(r => r.json()),
      fetch('/api/jobs?status=scheduled').then(r => r.json()),
    ]).then(([inProgress, scheduled]) => {
      setJobs([...(inProgress || []), ...(scheduled || [])].slice(0, 10))
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  return (
    <PanelLite
      title="Active jobs"
      status={jobs.length > 0 ? 'ok' : 'standby'}
      right={<span>{jobs.length} total</span>}
      noPadding
    >
      {jobs.length === 0 ? (
        <div className="py-12 text-center">
          <Briefcase className="w-7 h-7 mx-auto mb-3 text-slate-700" />
          <div className="text-sm text-slate-500">{loaded ? 'No active jobs' : 'Loading…'}</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Job</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Client</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 hidden md:table-cell">Property</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const tone = STATUS_TONE[job.status] || STATUS_TONE.completed
                return (
                  <tr
                    key={job.id}
                    className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-100 group-hover:text-[oklch(0.78_0.17_75)] transition-colors">
                          {job.title}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-[oklch(0.78_0.17_75)] transition-colors" />
                      </div>
                    </td>
                    <td className="px-3 py-3"><span className="text-sm text-slate-400">{job.client?.name || '—'}</span></td>
                    <td className="px-3 py-3 hidden md:table-cell"><span className="text-sm text-slate-500">{job.property?.name || '—'}</span></td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1.5 text-xs ${tone.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                        {tone.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </PanelLite>
  )
}
