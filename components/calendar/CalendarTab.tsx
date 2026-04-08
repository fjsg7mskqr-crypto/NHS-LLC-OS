'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import ErrorBanner from '@/components/ui/ErrorBanner'
import CreateBlockModal from './CreateBlockModal'
import type { CalendarBlock, Job } from '@/types'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type ViewMode = 'day' | 'week' | 'month'

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

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekStart(d: Date) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() - copy.getDay())
  return copy
}

function addDays(d: Date, n: number) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

export default function CalendarTab() {
  const today = new Date()
  const todayStr = fmtDate(today)

  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(today) // anchor date for navigation
  const [blocks, setBlocks] = useState<CalendarBlock[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [listKey, setListKey] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDeleteBlock(id: string) {
    if (!confirm('Delete this block? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/calendar-blocks?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete block')
      setBlocks(prev => prev.filter(b => b.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete block')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true)
      setError(null)
      try {
        const [b, j] = await Promise.all([
          fetch('/api/calendar-blocks').then(r => { if (!r.ok) throw new Error('Failed to load calendar'); return r.json() }),
          fetch('/api/jobs').then(r => { if (!r.ok) throw new Error('Failed to load jobs'); return r.json() }),
        ])
        setBlocks(b || [])
        setJobs(j || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [listKey])

  // Navigation
  const navigate = (dir: -1 | 1) => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (viewMode === 'day') d.setDate(d.getDate() + dir)
      else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7)
      else { d.setMonth(d.getMonth() + dir) }
      return d
    })
  }
  const goToday = () => setCurrentDate(today)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Helpers
  const getBlocksForDateStr = (ds: string) => blocks.filter(b => b.start_date <= ds && b.end_date >= ds)
  const getJobsForDateStr = (ds: string) => jobs.filter(j => j.scheduled_date === ds)

  // Header title
  const headerTitle = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
    if (viewMode === 'week') {
      const ws = getWeekStart(currentDate)
      const we = addDays(ws, 6)
      const start = ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const end = we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      return `${start} - ${end}`
    }
    return `${MONTH_NAMES[month]} ${year}`
  }

  // Sidebar detail
  const selectedBlocks = selectedDate ? blocks.filter(b => b.start_date <= selectedDate && b.end_date >= selectedDate) : []
  const selectedJobs = selectedDate ? jobs.filter(j => j.scheduled_date === selectedDate) : []

  const activeJobs = jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length

  // Build month grid
  const buildMonthGrid = () => {
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
    return weeks
  }

  const dateStr = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  // Event chip renderer
  const renderChips = (ds: string, limit: number) => {
    const dayBlocks = getBlocksForDateStr(ds)
    const dayJobs = getJobsForDateStr(ds)
    const total = dayBlocks.length + dayJobs.length
    return (
      <div className="mt-1 space-y-0.5">
        {dayBlocks.slice(0, limit).map(b => (
          <div key={b.id} className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${blockColor(b.type)}`}>
            {BLOCK_LABELS[b.type] || b.type}{b.property ? `: ${b.property.name}` : ''}
          </div>
        ))}
        {dayJobs.slice(0, Math.max(0, limit - dayBlocks.length)).map(j => (
          <div key={j.id} className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${jobColor(j.status)}`}>
            {j.title}
          </div>
        ))}
        {total > limit && (
          <div className="text-[10px] text-slate-500 px-1">+{total - limit} more</div>
        )}
      </div>
    )
  }

  // Detailed event list for day/week views
  const renderEventList = (ds: string) => {
    const dayBlocks = getBlocksForDateStr(ds)
    const dayJobs = getJobsForDateStr(ds)
    if (dayBlocks.length === 0 && dayJobs.length === 0) {
      return <p className="text-xs text-slate-600 italic py-2">No events</p>
    }
    return (
      <div className="space-y-1.5 py-1">
        {dayBlocks.map(b => (
          <div key={b.id} className={`text-xs px-2.5 py-1.5 rounded-lg border ${blockColor(b.type)}`}>
            <span className="font-medium">{BLOCK_LABELS[b.type] || b.type}</span>
            {b.property && <span className="opacity-80"> - {b.property.name}</span>}
            {b.notes && <p className="opacity-70 mt-0.5 text-[11px]">{b.notes}</p>}
            <p className="opacity-50 mt-0.5 text-[10px]">{b.start_date} to {b.end_date}</p>
          </div>
        ))}
        {dayJobs.map(j => (
          <div key={j.id} className={`text-xs px-2.5 py-1.5 rounded-lg border ${jobColor(j.status)}`}>
            <span className="font-medium">{j.title}</span>
            {j.client && <span className="opacity-80"> - {j.client.name}</span>}
            <p className="opacity-50 mt-0.5 text-[10px]">{j.status.replace('_', ' ')}</p>
          </div>
        ))}
      </div>
    )
  }

  // --- Views ---

  const renderDayView = () => {
    const ds = fmtDate(currentDate)
    const isToday = ds === todayStr
    return (
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-semibold ${isToday ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-300'}`}>
            {currentDate.getDate()}
          </span>
          <div>
            <p className="text-sm font-medium text-white">{DAY_NAMES_FULL[currentDate.getDay()]}</p>
            <p className="text-xs text-slate-500">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        {renderEventList(ds)}
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = getWeekStart(currentDate)
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    return (
      <div>
        <div className="grid grid-cols-7 border-b border-slate-800">
          {days.map(d => {
            const ds = fmtDate(d)
            const isToday = ds === todayStr
            const isSelected = ds === selectedDate
            return (
              <div
                key={ds}
                onClick={() => setSelectedDate(ds === selectedDate ? null : ds)}
                className={`px-2 py-3 text-center cursor-pointer border-r border-slate-800/50 last:border-r-0 transition-colors ${isSelected ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'}`}
              >
                <p className="text-[10px] text-slate-500 uppercase font-medium">{DAY_NAMES_SHORT[d.getDay()]}</p>
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold mt-1 ${isToday ? 'bg-emerald-500 text-black' : 'text-slate-300'}`}>
                  {d.getDate()}
                </span>
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-7 min-h-[320px]">
          {days.map(d => {
            const ds = fmtDate(d)
            const isSelected = ds === selectedDate
            return (
              <div
                key={ds}
                onClick={() => setSelectedDate(ds === selectedDate ? null : ds)}
                className={`border-r border-slate-800/50 last:border-r-0 p-2 cursor-pointer transition-colors ${isSelected ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'}`}
              >
                {renderEventList(ds)}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const weeks = buildMonthGrid()
    return (
      <div className="grid grid-cols-7">
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-slate-500 border-b border-slate-800">{d}</div>
        ))}
        {weeks.flat().map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="min-h-20 border-b border-r border-slate-800/50 bg-slate-950/30" />
          const ds = dateStr(day)
          const isToday = ds === todayStr
          const isSelected = ds === selectedDate
          return (
            <div
              key={ds}
              onClick={() => setSelectedDate(ds === selectedDate ? null : ds)}
              className={`min-h-20 border-b border-r border-slate-800/50 p-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'}`}
            >
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${isToday ? 'bg-emerald-500 text-black' : 'text-slate-400'}`}>
                {day}
              </span>
              {renderChips(ds, 2)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Calendar</h1>
          <p className="text-sm text-slate-500">{loading ? 'Loading...' : `${blocks.length} blocks \u00b7 ${activeJobs} active jobs`}</p>
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
          <p className="text-xs text-slate-500 mb-1">Total Blocks</p>
          <p className="text-lg font-semibold text-emerald-400 glow-emerald">{blocks.length}</p>
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
          {/* Header with nav + view switcher */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <h2 className="text-sm font-semibold text-white min-w-48 text-center">{headerTitle()}</h2>
              <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex rounded-lg border border-slate-700 overflow-hidden">
                {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      viewMode === mode
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    } ${mode !== 'day' ? 'border-l border-slate-700' : ''}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors">Today</button>
            </div>
          </div>

          {/* View content */}
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'month' && renderMonthView()}
        </div>

        {/* Day detail sidebar (shown in week/month views when a date is selected) */}
        {selectedDate && viewMode !== 'day' && (
          <div className="lg:w-72 rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4 self-start">
            <h3 className="text-sm font-semibold text-white">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            {selectedBlocks.length === 0 && selectedJobs.length === 0 && (
              <p className="text-xs text-slate-500">Nothing scheduled</p>
            )}
            {selectedBlocks.map(b => (
              <div key={b.id} className={`rounded-lg border p-3 ${blockColor(b.type)} relative group`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{BLOCK_LABELS[b.type] || b.type}</p>
                    {b.property && <p className="text-xs mt-1 opacity-80">{b.property.name}</p>}
                    {b.notes && <p className="text-xs mt-1 opacity-70">{b.notes}</p>}
                    <p className="text-[10px] mt-1 opacity-60">{b.start_date} - {b.end_date}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteBlock(b.id)}
                    disabled={deletingId === b.id}
                    title="Delete block"
                    className="flex-shrink-0 p-1 rounded hover:bg-red-500/20 text-current opacity-60 hover:opacity-100 hover:text-red-300 transition disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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
