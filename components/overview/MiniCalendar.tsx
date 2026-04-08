'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import Panel from '@/components/ui/Panel'

interface Block {
  id: string
  type: string
  start_date: string
  end_date: string
}

export default function MiniCalendar() {
  const now = new Date()
  const [month, setMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [blocks, setBlocks] = useState<Block[]>([])

  useEffect(() => {
    fetch('/api/calendar-blocks')
      .then(r => r.json())
      .then(data => setBlocks(data || []))
      .catch(() => {})
  }, [])

  const firstDay = new Date(month.year, month.month, 1).getDay()
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate()
  const monthStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}`
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const monthBlocks = blocks.filter(b => b.start_date.startsWith(monthStr) || b.end_date.startsWith(monthStr))

  function getDayBlocks(day: number) {
    const dateStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return monthBlocks.filter(b => b.start_date <= dateStr && b.end_date >= dateStr)
  }

  const monthLabel = new Date(month.year, month.month, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
  const prev = () => month.month === 0 ? setMonth({ year: month.year - 1, month: 11 }) : setMonth({ ...month, month: month.month - 1 })
  const next = () => month.month === 11 ? setMonth({ year: month.year + 1, month: 0 }) : setMonth({ ...month, month: month.month + 1 })

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <Panel
      title={monthLabel}
      right={
        <span className="flex gap-1">
          <button onClick={prev} className="p-0.5 hover:text-[oklch(0.78_0.17_75)] transition-colors"><ChevronLeft className="w-3 h-3" /></button>
          <button onClick={next} className="p-0.5 hover:text-[oklch(0.78_0.17_75)] transition-colors"><ChevronRight className="w-3 h-3" /></button>
        </span>
      }
    >
      <div className="font-mono">
        <div className="grid grid-cols-7 mb-1">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-[9px] tracking-[0.15em] text-slate-600 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const dateStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayBlocks = getDayBlocks(day)
            const isToday = dateStr === todayStr
            const hasSBR = dayBlocks.some(b => b.type === 'booking')
            const hasJob = dayBlocks.some(b => b.type === 'job_day')
            return (
              <div
                key={i}
                className={clsx(
                  'flex flex-col items-center py-1 border text-[10px] tabular-nums relative',
                  isToday && 'border-[oklch(0.78_0.17_75)] bg-[oklch(0.78_0.17_75/0.12)] text-[oklch(0.78_0.17_75)] font-bold',
                  !isToday && dayBlocks.length > 0 && 'border-slate-700/60 bg-slate-800/40 text-slate-300',
                  !isToday && dayBlocks.length === 0 && 'border-transparent text-slate-500'
                )}
              >
                <span>{String(day).padStart(2, '0')}</span>
                {(hasSBR || hasJob) && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasJob && <div className="w-1 h-1 bg-[oklch(0.75_0.18_145)]" />}
                    {hasSBR && <div className="w-1 h-1 bg-[oklch(0.78_0.17_75)]" />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex gap-3 mt-3 pt-3 border-t border-slate-700/60 text-[9px] tracking-[0.15em] text-slate-600">
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[oklch(0.75_0.18_145)]" />JOB DAY</div>
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[oklch(0.78_0.17_75)]" />BOOKING</div>
        </div>
      </div>
    </Panel>
  )
}
