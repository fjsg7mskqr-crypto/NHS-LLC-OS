'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

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
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white text-sm">{monthLabel}</h2>
          <div className="flex gap-1">
            <button onClick={prev} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={next} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 mb-2">
          {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="text-center text-xs text-slate-600 font-medium py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const dateStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayBlocks = getDayBlocks(day)
            const isToday = dateStr === todayStr
            const hasSBR = dayBlocks.some(b => b.type === 'booking')
            const hasJob = dayBlocks.some(b => b.type === 'job_day')
            return (
              <div key={i} className={clsx('flex flex-col items-center py-1.5 rounded-md', isToday && 'bg-emerald-500/20 ring-1 ring-emerald-500/50', !isToday && dayBlocks.length > 0 && 'bg-slate-800/50')}>
                <span className={clsx('text-xs', isToday ? 'text-emerald-300 font-bold' : 'text-slate-300')}>{day}</span>
                {(hasSBR || hasJob) && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasJob && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    {hasSBR && <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-2 h-2 rounded-full bg-emerald-400" />Job day</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-2 h-2 rounded-full bg-orange-400" />Booking</div>
        </div>
      </div>
    </div>
  )
}
