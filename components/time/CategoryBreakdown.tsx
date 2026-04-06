'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { CATEGORY_COLORS, CATEGORY_LABELS, formatMinutes } from '@/lib/utils'
import type { TimeEntry } from '@/types'

const CATEGORIES = ['client_work', 'drive_time', 'prep', 'admin'] as const
interface CategoryTotal {
  name: (typeof CATEGORIES)[number]
  label: string
  minutes: number
  color: string
}

function CategoryTooltip({
  active,
  payload,
  totalMinutes,
}: {
  active?: boolean
  payload?: Array<{ payload?: unknown }>
  totalMinutes: number
}) {
  const rawData = payload?.[0]?.payload
  if (!active || !rawData) return null

  const data = rawData as CategoryTotal
  const percent = totalMinutes > 0 ? ((data.minutes / totalMinutes) * 100).toFixed(0) : '0'

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-xs">
      <p className="font-medium text-white">{data.label}</p>
      <p className="text-slate-400 mt-1">{formatMinutes(data.minutes)}</p>
      <p className="text-slate-500">{percent}% of total</p>
    </div>
  )
}

export default function CategoryBreakdown({ weekStart }: { weekStart: string }) {
  const [totals, setTotals] = useState<CategoryTotal[]>([])

  useEffect(() => {
    fetch(`/api/time-entries?week_start=${weekStart}`)
      .then(r => r.json())
      .then((entries: TimeEntry[]) => {
        const computed = CATEGORIES.map(cat => ({
          name: cat,
          label: CATEGORY_LABELS[cat],
          minutes: (entries || []).filter(entry => entry.category === cat).reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0),
          color: CATEGORY_COLORS[cat],
        })).filter(c => c.minutes > 0)
        setTotals(computed)
      }).catch(() => {})
  }, [weekStart])

  const totalMinutes = totals.reduce((s, c) => s + c.minutes, 0)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800">
        <h2 className="font-semibold text-white">Time Breakdown</h2>
        <p className="text-xs text-slate-500 mt-0.5">This week by category</p>
      </div>
      <div className="p-5">
        <div className="relative">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={totals} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="minutes" strokeWidth={2} stroke="#111827">
                {totals.map(entry => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip content={props => <CategoryTooltip {...props} totalMinutes={totalMinutes} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-bold text-white">{formatMinutes(totalMinutes)}</span>
            <span className="text-xs text-slate-500">total</span>
          </div>
        </div>
        <div className="space-y-2 mt-2">
          {totals.map(cat => (
            <div key={cat.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="text-xs text-slate-400 flex-1">{cat.label}</span>
              <span className="text-xs font-mono text-slate-300">{formatMinutes(cat.minutes)}</span>
              <span className="text-xs text-slate-600 w-10 text-right">{((cat.minutes / totalMinutes) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
