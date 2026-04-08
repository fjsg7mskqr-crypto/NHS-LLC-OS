'use client'

import { useEffect, useState } from 'react'
import Panel from '@/components/ui/Panel'

interface TaskRow {
  id: string
  title: string
  priority: string
  due_date?: string
  client: { name: string } | null
  job: { title: string } | null
}

const PRIORITY_TONE: Record<string, string> = {
  high:   'text-[oklch(0.65_0.22_25)] border-[oklch(0.65_0.22_25/0.4)]',
  medium: 'text-[oklch(0.78_0.17_75)] border-[oklch(0.78_0.17_75/0.4)]',
  low:    'text-[oklch(0.70_0.15_230)] border-[oklch(0.70_0.15_230/0.4)]',
}

export default function TasksDue({ limit = 6 }: { limit?: number }) {
  const [upcoming, setUpcoming] = useState<TaskRow[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/tasks?limit=${limit}`)
      .then(r => r.json())
      .then(data => { setUpcoming(data || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [limit])

  const today = new Date()

  function daysUntil(dateStr: string) {
    const diff = Math.round((new Date(dateStr + 'T12:00:00').getTime() - today.getTime()) / 86400000)
    if (diff === 0) return 'T-00'
    if (diff < 0) return `T+${Math.abs(diff).toString().padStart(2, '0')}`
    return `T-${diff.toString().padStart(2, '0')}`
  }

  function urgencyTone(dateStr: string) {
    const diff = Math.round((new Date(dateStr + 'T12:00:00').getTime() - today.getTime()) / 86400000)
    if (diff <= 1) return 'text-[oklch(0.65_0.22_25)]'
    if (diff <= 3) return 'text-[oklch(0.78_0.17_75)]'
    return 'text-slate-500'
  }

  return (
    <Panel
      title="MISSION QUEUE"
      code="TSK-201"
      status={upcoming.length > 0 ? 'warn' : 'standby'}
      right={<span>{upcoming.length.toString().padStart(2, '0')} PENDING</span>}
      noPadding
    >
      {upcoming.length === 0 ? (
        <div className="py-10 text-center font-mono text-[10px] tracking-[0.25em] text-slate-600">
          [ {loaded ? 'QUEUE EMPTY' : 'LOADING...'} ]
        </div>
      ) : (
        <div className="font-mono">
          {upcoming.map((task, idx) => (
            <div
              key={task.id}
              className="flex items-start gap-3 px-4 py-2.5 border-b border-slate-800/60 last:border-b-0 hover:bg-[oklch(0.78_0.17_75/0.04)] transition-colors"
            >
              <span className="text-[9px] text-slate-700 mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-slate-200 leading-snug truncate">{task.title}</p>
                {(task.client || task.job) && (
                  <p className="text-[9px] tracking-[0.15em] text-slate-600 mt-0.5 truncate uppercase">
                    {task.client?.name}{task.job && ` · ${task.job.title}`}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-[9px] tracking-[0.15em] px-1.5 py-px border ${PRIORITY_TONE[task.priority] || 'text-slate-500 border-slate-700'} uppercase`}>
                  {task.priority}
                </span>
                <span className={`text-[10px] tabular-nums ${task.due_date ? urgencyTone(task.due_date) : 'text-slate-700'}`}>
                  {task.due_date ? daysUntil(task.due_date) : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
