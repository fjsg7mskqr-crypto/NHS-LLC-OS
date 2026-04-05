'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import ErrorBanner from '@/components/ui/ErrorBanner'
import CreateBlockModal from './CreateBlockModal'
import type { CalendarBlock, Property, Job } from '@/types'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function blockColor(type: string) {
  switch (type) {
    case 'booking': return 'bg-violet-500/30 border-violet-500/50 text-violet-300'
    case 'unavailable': return 'bg-red-500/30 border-red-500/50 text-red-300'
    default: return 'bg-emerald-500/30 border-emerald-500/50 text-emerald-300'
  }
}

const BLOCK_LABELS: Record<string, string> = {
  booking: 'Booking',
  job_day: 'Job Day',
  unavailable: 'Unavailable',
}

function jobColor(status: string) {
  switch (status) {
    case 'scheduled': return 'bg-blue-500/30 border-blue-500/50 text-blue-300'
    case 'in_progress': return 'bg-amber-500/30 border-amber-500/50 text-amber-300'
    default: return 'bg-slate-500/30 border-slate-500/50 text-slate-300'
  }
}

export default function CalendarTab() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [blocks, setBlocks] = useState<CalendarBlock[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [listKey, setListKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetch('/api/calendar-blocks').then(r => { if (!r.ok) throw new Error('Failed to load calendar'); return r.json() }),
      fetch('/api/jobs').then(r => { if (!r.ok) throw new Error('Failed to load jobs'); return r.json() }),
    ])
      .then(([b, j]) => { setBlocks(b || []); setJobs(j || []) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [listKey])

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(firstDay).fill(null)

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  const dateStr = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Which blocks/jobs overlap a given date
  const getBlocksForDate = (d: number) => {
    const ds = dateStr(d)
    return blocks.filter(b => b.start_date <= ds && b.end_date >= ds)
  }
  const getJobsForDate = (d: number) => {
    const ds = dateStr(d)
    return jobs.filter(j => {
      const jd = j.scheduled_date
      return jd === ds
    })
  }

  // Sidebar detail
  const selectedBlocks = selectedDate ? blocks.filter(b => b.start_date <= selectedDate && b.end_date >= selectedDate) : []
  const selectedJobs = selectedDate ? jobs.filter(j => j.scheduled_date === selectedDate) : []

  const activeJobs = jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length
  const thisMonthBlocks = blocks.filter(b => {
    const ms = `${year}-${String(month + 1).padStart(2, '0')}`
    return b.start_date.startsWith(ms) || b.end_date.startsWith(ms) || (b.start_date < ms + '-01' && b.end_date >= ms + '-01')
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Calendar</h1>
          <p className="text-sm text-slate-500">{loading ? 'Loading...' : `${blocks.length} blocks · ${activeJobs} active jobs`}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Block
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
        <div className="metric-card metric-card--emerald rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">This Month Blocks</p>
          <p className="text-lg font-semibold text-emerald-400 glow-emerald">{thisMonthBlocks.length}</p>
        </div>
        <div className="metric-card metric-card--blue rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Scheduled Jobs</p>
          <p className="text-lg font-semibold text-blue-400 glow-blue">{jobs.filter(j => j.status === 'scheduled').length}</p>
        </div>
        <div className="metric-card metric-card--amber rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">In Progress</p>
          <p className="text-lg font-semibold text-amber-400 glow-amber">{jobs.filter(j => j.status === 'in_progress').length}</p>
        </div>
        <div className="metric-card metric-card--violet rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Bookings</p>
          <p className="text-lg font-semibold text-violet-400 glow-violet">{blocks.filter(b => b.type === 'booking').length}</p>
        </div>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Calendar Grid */}
        <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <h2 className="text-sm font-semibold text-white min-w-36 text-center">{MONTH_NAMES[month]} {year}</h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors">Today</button>
          </div>
          <div className="grid grid-cols-7">
            {DAY_NAMES.map(d => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-slate-500 border-b border-slate-800">{d}</div>
            ))}
            {weeks.flat().map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className="min-h-20 border-b border-r border-slate-800/50 bg-slate-950/30" />
              const ds = dateStr(day)
              const isToday = ds === todayStr
              const isSelected = ds === selectedDate
              const dayBlocks = getBlocksForDate(day)
              const dayJobs = getJobsForDate(day)
              return (
                <div
                  key={ds}
                  onClick={() => setSelectedDate(ds === selectedDate ? null : ds)}
                  className={`min-h-20 border-b border-r border-slate-800/50 p-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'}`}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${isToday ? 'bg-emerald-500 text-black' : 'text-slate-400'}`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayBlocks.slice(0, 2).map(b => (
                      <div key={b.id} className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${blockColor(b.type)}`}>
                        {BLOCK_LABELS[b.type] || b.type}{b.property ? `: ${b.property.name}` : ''}
                      </div>
                    ))}
                    {dayJobs.slice(0, 2).map(j => (
                      <div key={j.id} className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${jobColor(j.status)}`}>
                        {j.title}
                      </div>
                    ))}
                    {(dayBlocks.length + dayJobs.length > 4) && (
                      <div className="text-[10px] text-slate-500 px-1">+{dayBlocks.length + dayJobs.length - 4} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Day detail sidebar */}
        {selectedDate && (
          <div className="lg:w-72 rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4 self-start">
            <h3 className="text-sm font-semibold text-white">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            {selectedBlocks.length === 0 && selectedJobs.length === 0 && (
              <p className="text-xs text-slate-500">Nothing scheduled</p>
            )}
            {selectedBlocks.map(b => (
              <div key={b.id} className={`rounded-lg border p-3 ${blockColor(b.type)}`}>
                <p className="text-xs font-medium">{BLOCK_LABELS[b.type] || b.type}</p>
                {b.property && <p className="text-xs mt-1 opacity-80">{b.property.name}</p>}
                {b.notes && <p className="text-xs mt-1 opacity-70">{b.notes}</p>}
                <p className="text-[10px] mt-1 opacity-60">{b.start_date} - {b.end_date}</p>
              </div>
            ))}
            {selectedJobs.map(j => (
              <div key={j.id} className={`rounded-lg border p-3 ${jobColor(j.status)}`}>
                <p className="text-xs font-medium">{j.title}</p>
                {j.client && <p className="text-xs mt-1 opacity-80">{j.client.name}</p>}
                <p className="text-[10px] mt-1 opacity-60">{j.status.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateBlockModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); setListKey(k => k + 1) }}
        />
      )}
    </div>
  )
}
