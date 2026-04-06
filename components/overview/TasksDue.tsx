'use client'

import { useEffect, useState } from 'react'
import { CheckSquare, Calendar } from 'lucide-react'
import { priorityColor } from '@/lib/utils'

interface TaskRow {
  id: string
  title: string
  priority: string
  due_date?: string
  client: { name: string } | null
  job: { title: string } | null
}

export default function TasksDue({ limit = 6 }: { limit?: number }) {
  const [upcoming, setUpcoming] = useState<TaskRow[]>([])

  useEffect(() => {
    fetch(`/api/tasks?limit=${limit}`)
      .then(r => r.json())
      .then(data => setUpcoming(data || []))
      .catch(() => {})
  }, [limit])

  const today = new Date()

  function daysUntil(dateStr: string) {
    const diff = Math.round((new Date(dateStr + 'T12:00:00').getTime() - today.getTime()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    if (diff < 0) return `${Math.abs(diff)}d overdue`
    return `in ${diff}d`
  }

  function urgencyColor(dateStr: string) {
    const diff = Math.round((new Date(dateStr + 'T12:00:00').getTime() - today.getTime()) / 86400000)
    if (diff <= 1) return 'text-red-400'
    if (diff <= 3) return 'text-amber-400'
    return 'text-slate-500'
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
        <CheckSquare className="w-4 h-4 text-slate-400" />
        <h2 className="font-semibold text-white">Tasks Due Soon</h2>
      </div>
      <div className="divide-y divide-slate-800/50">
        {upcoming.map(task => (
          <div key={task.id} className="px-5 py-3 hover:bg-slate-800/30 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 leading-snug">{task.title}</p>
                {(task.client || task.job) && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {task.client?.name}{task.job && ` — ${task.job.title}`}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${priorityColor(task.priority)}`}>{task.priority}</span>
                <span className={`text-xs font-medium ${task.due_date ? urgencyColor(task.due_date) : 'text-slate-500'}`}>
                  <Calendar className="w-3 h-3 inline mr-0.5" />
                  {task.due_date ? daysUntil(task.due_date) : '—'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
