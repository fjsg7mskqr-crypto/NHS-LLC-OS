'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, Briefcase } from 'lucide-react'
import Panel from '@/components/ui/Panel'

interface JobRow {
  id: string
  title: string
  status: string
  client: { name: string } | null
  property: { name: string } | null
}

const STATUS_TONE: Record<string, { dot: string; text: string; label: string }> = {
  in_progress: { dot: 'bg-[oklch(0.75_0.18_145)] shadow-[0_0_6px_oklch(0.75_0.18_145)]', text: 'text-[oklch(0.75_0.18_145)]', label: 'IN PROGRESS' },
  scheduled:   { dot: 'bg-[oklch(0.70_0.15_230)] shadow-[0_0_6px_oklch(0.70_0.15_230)]', text: 'text-[oklch(0.70_0.15_230)]', label: 'SCHEDULED' },
  completed:   { dot: 'bg-slate-600',                                                     text: 'text-slate-500',              label: 'COMPLETED' },
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
    <Panel
      title="ACTIVE JOBS"
      status={jobs.length > 0 ? 'ok' : 'standby'}
      right={<span>{jobs.length} TOTAL</span>}
      noPadding
    >
      {jobs.length === 0 ? (
        <div className="py-12 text-center font-mono">
          <Briefcase className="w-7 h-7 mx-auto mb-3 text-slate-700" />
          <div className="text-[10px] tracking-[0.25em] text-slate-600">
            {loaded ? 'NO ACTIVE JOBS' : 'LOADING...'}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-mono">
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-900/30">
                <th className="text-left px-4 py-2 text-[9px] tracking-[0.2em] text-slate-500">JOB</th>
                <th className="text-left px-3 py-2 text-[9px] tracking-[0.2em] text-slate-500">CLIENT</th>
                <th className="text-left px-3 py-2 text-[9px] tracking-[0.2em] text-slate-500 hidden md:table-cell">PROPERTY</th>
                <th className="text-right px-4 py-2 text-[9px] tracking-[0.2em] text-slate-500">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, idx) => {
                const tone = STATUS_TONE[job.status] || STATUS_TONE.completed
                return (
                  <tr
                    key={job.id}
                    className="border-b border-slate-800/60 hover:bg-[oklch(0.78_0.17_75/0.04)] transition-colors group"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-700">{String(idx + 1).padStart(2, '0')}</span>
                        <span className="text-[12px] text-slate-200 group-hover:text-[oklch(0.78_0.17_75)] transition-colors uppercase tracking-wide">
                          {job.title}
                        </span>
                        <ArrowUpRight className="w-3 h-3 text-slate-700 group-hover:text-[oklch(0.78_0.17_75)] transition-colors" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><span className="text-[11px] text-slate-400 uppercase tracking-wide">{job.client?.name || '—'}</span></td>
                    <td className="px-3 py-2.5 hidden md:table-cell"><span className="text-[11px] text-slate-500 uppercase tracking-wide">{job.property?.name || '—'}</span></td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] ${tone.text}`}>
                        <span className={`w-1.5 h-1.5 ${tone.dot}`} />
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
    </Panel>
  )
}
