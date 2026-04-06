'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfWeek, endOfWeek, addDays, addWeeks, addMonths,
  format, startOfMonth, endOfMonth, parseISO,
} from 'date-fns'
import DailyTimeline from './DailyTimeline'
import WeeklyChart from './WeeklyChart'
import CategoryBreakdown from './CategoryBreakdown'
import ProfitabilityTables from './ProfitabilityTables'
import TimesheetExportPanel from './TimesheetExportPanel'
import TimeEntryForm from './TimeEntryForm'
import type { TimeEntry } from '@/types'

type ViewMode = 'day' | 'week' | 'month' | 'custom'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/* ---------- Mini calendar grid (reused for navigation + range picking) ---------- */
function MiniCalendarGrid({
  displayMonth,
  selectedDate,
  rangeStart,
  rangeEnd,
  hoverDate,
  onDateClick,
  onDateHover,
  entryCounts,
}: {
  displayMonth: Date
  selectedDate: string | null
  rangeStart: string | null
  rangeEnd: string | null
  hoverDate: string | null
  onDateClick: (ds: string) => void
  onDateHover?: (ds: string | null) => void
  entryCounts?: Record<string, number>
}) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const year = displayMonth.getFullYear()
  const month = displayMonth.getMonth()
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

  const isInRange = (ds: string) => {
    if (!rangeStart) return false
    const effectiveEnd = rangeEnd || hoverDate
    if (!effectiveEnd) return ds === rangeStart
    const lo = rangeStart < effectiveEnd ? rangeStart : effectiveEnd
    const hi = rangeStart < effectiveEnd ? effectiveEnd : rangeStart
    return ds >= lo && ds <= hi
  }

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-slate-600 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="h-8" />
          const ds = dateStr(day)
          const isToday = ds === today
          const isSelected = ds === selectedDate
          const inRange = isInRange(ds)
          const isRangeEdge = ds === rangeStart || ds === rangeEnd
          const count = entryCounts?.[ds] || 0

          return (
            <div
              key={ds}
              onClick={() => onDateClick(ds)}
              onMouseEnter={() => onDateHover?.(ds)}
              onMouseLeave={() => onDateHover?.(null)}
              className={`h-8 flex items-center justify-center relative cursor-pointer transition-colors text-xs
                ${inRange ? 'bg-emerald-500/10' : ''}
                ${isRangeEdge ? 'bg-emerald-500/20' : ''}
                ${!inRange && !isSelected ? 'hover:bg-slate-800' : ''}
              `}
            >
              <span className={`w-7 h-7 flex items-center justify-center rounded-full relative z-10
                ${isToday && !isSelected ? 'ring-1 ring-emerald-500/50' : ''}
                ${isSelected ? 'bg-emerald-500 text-black font-semibold' : isToday ? 'text-emerald-400 font-medium' : 'text-slate-400'}
              `}>
                {day}
              </span>
              {count > 0 && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TimeTab() {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState(today) // drives the calendar display month + navigation
  const [selectedDate, setSelectedDate] = useState(todayStr) // single date for day/week/month
  const [customStart, setCustomStart] = useState<string | null>(null)
  const [customEnd, setCustomEnd] = useState<string | null>(null)
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [entries, setEntries] = useState<TimeEntry[]>([])

  // Fetch entries for the visible range to show dots on the calendar
  const visibleRange = useMemo(() => {
    if (viewMode === 'day') return { start: selectedDate, end: selectedDate }
    if (viewMode === 'week') {
      const ws = startOfWeek(anchor, { weekStartsOn: 0 })
      return { start: format(ws, 'yyyy-MM-dd'), end: format(addDays(ws, 6), 'yyyy-MM-dd') }
    }
    if (viewMode === 'custom' && customStart && customEnd) {
      const lo = customStart < customEnd ? customStart : customEnd
      const hi = customStart < customEnd ? customEnd : customStart
      return { start: lo, end: hi }
    }
    // month
    return {
      start: format(startOfMonth(anchor), 'yyyy-MM-dd'),
      end: format(endOfMonth(anchor), 'yyyy-MM-dd'),
    }
  }, [viewMode, anchor, selectedDate, customStart, customEnd])

  useEffect(() => {
    fetch(`/api/time-entries?start_date=${visibleRange.start}&end_date=${visibleRange.end}`)
      .then(r => r.json())
      .then(data => setEntries(data || []))
      .catch(() => setEntries([]))
  }, [visibleRange.start, visibleRange.end, refreshKey])

  // Count entries per day for calendar dots
  const entryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    entries.forEach(e => {
      const d = e.start_time?.slice(0, 10)
      if (d) counts[d] = (counts[d] || 0) + 1
    })
    return counts
  }, [entries])

  // Navigation
  const navigate = (dir: -1 | 1) => {
    if (viewMode === 'custom') {
      // In custom mode, shift the display month
      setAnchor(prev => addMonths(prev, dir))
      return
    }
    setAnchor(prev => {
      if (viewMode === 'day') {
        const next = addDays(prev, dir)
        setSelectedDate(format(next, 'yyyy-MM-dd'))
        return next
      }
      if (viewMode === 'week') return addWeeks(prev, dir)
      return addMonths(prev, dir)
    })
  }
  const goToday = () => {
    setAnchor(today)
    setSelectedDate(todayStr)
    if (viewMode === 'custom') {
      setCustomStart(todayStr)
      setCustomEnd(todayStr)
    }
  }

  // Calendar click handler
  const handleCalendarClick = (ds: string) => {
    if (viewMode === 'custom') {
      // Range selection: first click sets start, second sets end
      if (!customStart || (customStart && customEnd)) {
        setCustomStart(ds)
        setCustomEnd(null)
      } else {
        setCustomEnd(ds)
      }
      setSelectedDate(ds)
    } else {
      setSelectedDate(ds)
      if (viewMode === 'day') setAnchor(new Date(ds + 'T12:00:00'))
    }
  }

  // The date shown in the daily timeline
  const timelineDate = selectedDate

  // Week start for the chart (Sunday of selected date's week)
  const weekStart = format(startOfWeek(new Date(selectedDate + 'T12:00:00'), { weekStartsOn: 0 }), 'yyyy-MM-dd')

  // Header title
  const headerTitle = () => {
    if (viewMode === 'day') return format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')
    if (viewMode === 'week') {
      const ws = startOfWeek(anchor, { weekStartsOn: 0 })
      return `${format(ws, 'MMM d')} - ${format(addDays(ws, 6), 'MMM d, yyyy')}`
    }
    if (viewMode === 'custom') {
      if (customStart && customEnd) {
        const lo = customStart < customEnd ? customStart : customEnd
        const hi = customStart < customEnd ? customEnd : customStart
        return `${format(parseISO(lo), 'MMM d')} - ${format(parseISO(hi), 'MMM d, yyyy')}`
      }
      if (customStart) return `${format(parseISO(customStart), 'MMM d, yyyy')} - select end date`
      return 'Select a date range'
    }
    return format(anchor, 'MMMM yyyy')
  }

  // For week view, compute the highlighted week range
  const weekHighlight = viewMode === 'week'
    ? {
        start: format(startOfWeek(anchor, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(anchor, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      }
    : null

  const handleEdit = (entry: TimeEntry) => setEditingEntry(entry)
  const handleSaved = () => setRefreshKey(k => k + 1)

  // Stats from current entries
  const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const billableMinutes = entries.filter(e => e.billable).reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const totalHours = (totalMinutes / 60).toFixed(1)
  const billableHours = (billableMinutes / 60).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">Time</h1>
          <p className="text-sm text-slate-500">{headerTitle()}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors">
          <Plus className="w-4 h-4" /> Add Entry
        </button>
      </div>

      {/* Calendar navigator + timeline layout */}
      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Left: Calendar navigator */}
        <div className="lg:w-72 flex-shrink-0 space-y-4">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            {(['day', 'week', 'month', 'custom'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode)
                  if (mode === 'day') setAnchor(new Date(selectedDate + 'T12:00:00'))
                  if (mode === 'custom' && !customStart) {
                    setCustomStart(selectedDate)
                    setCustomEnd(null)
                  }
                }}
                className={`flex-1 px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                } ${mode !== 'day' ? 'border-l border-slate-700' : ''}`}
              >
                {mode === 'custom' ? 'Range' : mode}
              </button>
            ))}
          </div>

          {/* Calendar card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => navigate(-1)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-white">{MONTH_NAMES[anchor.getMonth()]} {anchor.getFullYear()}</span>
              <button onClick={() => navigate(1)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <MiniCalendarGrid
              displayMonth={anchor}
              selectedDate={selectedDate}
              rangeStart={viewMode === 'custom' ? customStart : weekHighlight?.start ?? null}
              rangeEnd={viewMode === 'custom' ? customEnd : weekHighlight?.end ?? null}
              hoverDate={viewMode === 'custom' ? hoverDate : null}
              onDateClick={handleCalendarClick}
              onDateHover={viewMode === 'custom' ? setHoverDate : undefined}
              entryCounts={entryCounts}
            />

            <div className="mt-3 flex items-center justify-between">
              <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors">
                Today
              </button>
              {viewMode === 'custom' && customStart && customEnd && (
                <button
                  onClick={() => { setCustomStart(null); setCustomEnd(null) }}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Clear range
                </button>
              )}
            </div>
          </div>

          {/* Quick stats for visible range */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Hours</span>
              <span className="text-white font-medium">{totalHours}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Billable Hours</span>
              <span className="text-emerald-400 font-medium">{billableHours}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Entries</span>
              <span className="text-white font-medium">{entries.length}</span>
            </div>
          </div>
        </div>

        {/* Right: Timeline + charts */}
        <div className="flex-1 space-y-6">
          <DailyTimeline key={`${timelineDate}-${refreshKey}`} date={timelineDate} onEdit={handleEdit} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2"><WeeklyChart key={`${weekStart}-${refreshKey}`} weekStart={weekStart} /></div>
            <div><CategoryBreakdown key={`${weekStart}-${refreshKey}`} weekStart={weekStart} /></div>
          </div>
        </div>
      </div>

      <TimesheetExportPanel />
      <ProfitabilityTables />
      {showForm && <TimeEntryForm onClose={() => setShowForm(false)} onSaved={handleSaved} />}
      {editingEntry && <TimeEntryForm entry={editingEntry} onClose={() => setEditingEntry(null)} onSaved={handleSaved} />}
    </div>
  )
}
