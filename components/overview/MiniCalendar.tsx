'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import PanelLite from '@/components/ui/PanelLite'

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

  const monthLabel = new Date(month.year, month.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const prev = () => month.month === 0 ? setMonth({ year: month.year - 1, month: 11 }) : setMonth({ ...month, month: month.month - 1 })
  const next = () => month.month === 11 ? setMonth({ year: month.year + 1, month: 0 }) : setMonth({ ...month, month: month.month + 1 })

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <PanelLite
      title={monthLabel}
      right={
        <span className="flex gap-1">
          <button onClick={prev} className="p-1 rounded hover:text-[oklch(0.78_0.17_75)] hover:bg-slate-800 transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <button onClick={next} className="p-1 rounded hover:text-[oklch(0.78_0.17_75)] hover:bg-slate-800 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
        </span>
      }
    >
      <div>
        <div className="grid grid-cols-7 mb-1">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-xs text-slate-500 py-1">{d}</div>
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
                  'flex flex-col items-center py-1 rounded text-xs tabular-nums relative',
                  isToday && 'bg-[oklch(0.78_0.17_75)]/15 text-[oklch(0.78_0.17_75)] font-semibold',
                  !isToday && dayBlocks.length > 0 && 'bg-slate-800/60 text-slate-300',
                  !isToday && dayBlocks.length === 0 && 'text-slate-500'
                )}
              >
                <span>{day}</span>
                {(hasSBR || hasJob) && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasJob && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
                    {hasSBR && <div className="w-1 h-1 rounded-full bg-[oklch(0.78_0.17_75)]" />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex gap-3 mt-3 pt-3 border-t border-slate-800 text-xs text-slate-500">
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Job day</div>
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[oklch(0.78_0.17_75)]" />Booking</div>
        </div>
      </div>
    </PanelLite>
  )
}
