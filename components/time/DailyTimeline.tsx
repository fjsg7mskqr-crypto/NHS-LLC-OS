'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { CATEGORY_COLORS, CATEGORY_LABELS, formatCurrency, formatMinutes } from '@/lib/utils'
import type { CategoryType, TimeEntry } from '@/types'

const DAY_START_HOUR = 7
const DAY_END_HOUR = 18
const TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60

function timeToMins(iso: string) {
  const d = new Date(iso)
  return (d.getHours() * 60 + d.getMinutes()) - DAY_START_HOUR * 60
}

function fmtHour(h: number) {
  if (h === 12) return '12p'
  return h > 12 ? `${h - 12}p` : `${h}a`
}

export default function DailyTimeline({ date, onEdit, onDelete }: { date: string; onEdit?: (entry: TimeEntry) => void; onDelete?: () => void }) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [key, setKey] = useState(0)

  useEffect(() => {
    fetch(`/api/time-entries?date=${date}`)
      .then(r => r.json())
      .then(data => setEntries(data || []))
      .catch(() => setEntries([]))
  }, [date, key])

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/time-entries?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConfirmDeleteId(null)
        setKey(k => k + 1)
        onDelete?.()
      }
    } catch {}
    setDeleting(false)
  }

  const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const billableMinutes = entries.filter(e => e.billable).reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const hourMarkers = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="font-semibold text-white">Daily Timeline</h2>
        <div className="flex gap-4 text-sm">
          <span className="text-slate-400">Total: <span className="text-white font-medium">{formatMinutes(totalMinutes)}</span></span>
          <span className="text-slate-400">Billable: <span className="text-emerald-400 font-medium">{formatMinutes(billableMinutes)}</span></span>
        </div>
      </div>
      <div className="p-5">
        {entries.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No entries for this day</div>
        ) : (
          <>
            <div className="flex mb-2">
              {hourMarkers.map(h => (
                <div key={h} className="text-xs text-slate-600" style={{ width: `${100 / (DAY_END_HOUR - DAY_START_HOUR)}%` }}>{fmtHour(h)}</div>
              ))}
            </div>
            <div className="relative h-12 bg-slate-800/50 rounded-lg overflow-hidden">
              {hourMarkers.slice(1).map(h => (
                <div key={h} className="absolute top-0 h-full w-px bg-slate-700/50" style={{ left: `${((h - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)) * 100}%` }} />
              ))}
              {entries.map(entry => {
                const startMins = Math.max(0, timeToMins(entry.start_time))
                const duration = entry.duration_minutes || 0
                return (
                  <div key={entry.id} className="timeline-bar absolute top-1 bottom-1 rounded cursor-pointer"
                    style={{ left: `${(startMins / TOTAL_MINUTES) * 100}%`, width: `${Math.max(0.5, (duration / TOTAL_MINUTES) * 100)}%`, backgroundColor: CATEGORY_COLORS[entry.category as CategoryType], opacity: 0.85 }}
                  />
                )
              })}
            </div>
            <div className="mt-4 space-y-2">
              {entries.map(entry => {
                const color = CATEGORY_COLORS[entry.category as CategoryType]
                const start = new Date(entry.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                const end = entry.end_time ? new Date(entry.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—'
                const value = entry.billable && entry.billable_amount ? formatCurrency(entry.billable_amount) : null
                return (
                  <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 transition-colors group">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium" style={{ color }}>{CATEGORY_LABELS[entry.category as CategoryType]}</span>
                        {entry.client && <span className="text-xs text-slate-500">— {entry.client.name}</span>}
                        {entry.job && <span className="text-xs text-slate-600">/ {entry.job.title}</span>}
                      </div>
                      {entry.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{entry.notes}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400 font-mono">{start} – {end}</p>
                      <p className="text-xs font-medium mt-0.5">
                        {value ? <span className="text-emerald-400">{value}</span> : <span className="text-slate-600">{formatMinutes(entry.duration_minutes || 0)}</span>}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {confirmDeleteId === entry.id ? (
                        <>
                          <button onClick={() => handleDelete(entry.id)} disabled={deleting} className="px-2 py-1 rounded text-xs bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 disabled:opacity-50">Yes</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 rounded text-xs border border-slate-700 text-slate-400">No</button>
                        </>
                      ) : (
                        <>
                          {onEdit && <button onClick={() => onEdit(entry)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>}
                          <button onClick={() => setConfirmDeleteId(entry.id)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
