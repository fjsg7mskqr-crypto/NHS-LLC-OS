'use client'

import { useEffect, useState } from 'react'
import PanelLite from '@/components/ui/PanelLite'

interface TaskRow {
  id: string
  title: string
  priority: string
  due_date?: string
  client: { name: string } | null
  job: { title: string } | null
}

const PRIORITY_TONE: Record<string, string> = {
  high:   'text-red-400 border-red-500/30 bg-red-500/10',
  medium: 'text-[oklch(0.78_0.17_75)] border-[oklch(0.78_0.17_75)]/30 bg-[oklch(0.78_0.17_75)]/10',
  low:    'text-sky-400 border-sky-500/30 bg-sky-500/10',
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
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    if (diff < 0) return `${Math.abs(diff)}d overdue`
    return `In ${diff}d`
  }

  function urgencyTone(dateStr: string) {
    const diff = Math.round((new Date(dateStr + 'T12:00:00').getTime() - today.getTime()) / 86400000)
    if (diff <= 1) return 'text-red-400'
    if (diff <= 3) return 'text-[oklch(0.78_0.17_75)]'
    return 'text-slate-500'
  }

  return (
    <PanelLite
      title="Tasks due"
      status={upcoming.length > 0 ? 'warn' : 'standby'}
      right={<span>{upcoming.length} pending</span>}
      noPadding
    >
      {upcoming.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500">
          {loaded ? 'No tasks due' : 'Loading…'}
        </div>
      ) : (
        <div>
          {upcoming.map(task => (
            <div
              key={task.id}
              className="flex items-start gap-3 px-4 py-3 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-100 leading-snug truncate">{task.title}</p>
                {(task.client || task.job) && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {task.client?.name}{task.job && ` · ${task.job.title}`}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${PRIORITY_TONE[task.priority] || 'text-slate-500 border-slate-700 bg-slate-800/50'}`}>
                  {task.priority}
                </span>
                <span className={`text-xs tabular-nums ${task.due_date ? urgencyTone(task.due_date) : 'text-slate-700'}`}>
                  {task.due_date ? daysUntil(task.due_date) : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelLite>
  )
}
