'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TooltipProps } from 'recharts'
import { addDays, format } from 'date-fns'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/utils'
import type { TimeEntry } from '@/types'

const CATEGORIES = ['client_work', 'drive_time', 'prep', 'admin'] as const
type ChartCategory = (typeof CATEGORIES)[number]

interface WeeklyChartRow {
  day: string
  client_work: number
  drive_time: number
  prep: number

  admin: number
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((sum, item) => sum + (typeof item.value === 'number' ? item.value : 0), 0)

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-xs">
      <p className="font-semibold text-white mb-2">{label}</p>
      {[...payload].reverse().map(item => (
        <div key={String(item.dataKey)} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.fill || '#64748b' }} />
            <span className="text-slate-400">
              {typeof item.dataKey === 'string' && item.dataKey in CATEGORY_LABELS
                ? CATEGORY_LABELS[item.dataKey as ChartCategory]
                : String(item.dataKey)}
            </span>
          </div>
          <span className="text-white font-mono">
            {typeof item.value === 'number' ? item.value.toFixed(1) : '0.0'}h
          </span>
        </div>
      ))}
      <div className="border-t border-slate-700 mt-2 pt-2 flex justify-between">
        <span className="text-slate-400">Total</span>
        <span className="text-white font-bold font-mono">{total.toFixed(1)}h</span>
      </div>
    </div>
  )
}

export default function WeeklyChart({ weekStart }: { weekStart: string }) {
  const [data, setData] = useState<WeeklyChartRow[]>([])

  useEffect(() => {
    fetch(`/api/time-entries?week_start=${weekStart}`)
      .then(r => r.json())
      .then((entries: TimeEntry[]) => {
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = addDays(new Date(weekStart + 'T12:00:00'), i)
          return { dateStr: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE') }
        })
        const chartData = days.map(({ dateStr, label }) => {
          const dayEntries = (entries || []).filter(e => e.start_time?.startsWith(dateStr))
          const row: WeeklyChartRow = {
            day: label,
            client_work: 0,
            drive_time: 0,
            prep: 0,

            admin: 0,
          }
          CATEGORIES.forEach(cat => {
            row[cat] = dayEntries
              .filter(entry => entry.category === cat)
              .reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) / 60
          })
          return row
        })
        setData(chartData)
      }).catch(() => {})
  }, [weekStart])

  const weekLabel = weekStart ? `Week of ${format(new Date(weekStart + 'T12:00:00'), 'MMM d')}` : ''

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800">
        <h2 className="font-semibold text-white">Weekly Hours</h2>
        <p className="text-xs text-slate-500 mt-0.5">{weekLabel}</p>
      </div>
      <div className="p-5">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
            <Tooltip content={CustomTooltip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            {CATEGORIES.map((cat, i) => (
              <Bar key={cat} dataKey={cat} stackId="hours" fill={CATEGORY_COLORS[cat]}
                radius={i === CATEGORIES.length - 1 ? ([4, 4, 0, 0] as [number,number,number,number]) : undefined} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
          {CATEGORIES.map(cat => (
            <div key={cat} className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
              {CATEGORY_LABELS[cat]}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
