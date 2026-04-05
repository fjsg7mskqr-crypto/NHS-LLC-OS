'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { MOCK_TIME_ENTRIES } from '@/lib/mock-data'
import { CATEGORY_COLORS, CATEGORY_LABELS, formatMinutes } from '@/lib/utils'
import type { CategoryType } from '@/types'

const CATEGORIES = ['client_work', 'drive_time', 'prep', 'errand', 'admin'] as const

export default function CategoryBreakdown() {
  const weekEntries = MOCK_TIME_ENTRIES.filter(te => {
    const d = new Date(te.start_time)
    return d >= new Date('2026-03-30') && d <= new Date('2026-04-05')
  })
  const totals = CATEGORIES.map(cat => ({
    name: cat, label: CATEGORY_LABELS[cat],
    minutes: weekEntries.filter(te => te.category === cat).reduce((s, te) => s + (te.duration_minutes || 0), 0),
    color: CATEGORY_COLORS[cat],
  })).filter(c => c.minutes > 0)

  const totalMinutes = totals.reduce((s, c) => s + c.minutes, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-xs">
        <p className="font-medium text-white">{d.label}</p>
        <p className="text-slate-400 mt-1">{formatMinutes(d.minutes)}</p>
        <p className="text-slate-500">{((d.minutes / totalMinutes) * 100).toFixed(0)}% of total</p>
      </div>
    )
  }

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
              <Tooltip content={<CustomTooltip />} />
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
