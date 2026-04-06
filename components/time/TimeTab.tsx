'use client'

import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { startOfWeek, addDays, addWeeks, addMonths, format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import DailyTimeline from './DailyTimeline'
import WeeklyChart from './WeeklyChart'
import CategoryBreakdown from './CategoryBreakdown'
import ProfitabilityTables from './ProfitabilityTables'
import TimesheetExportPanel from './TimesheetExportPanel'
import TimeEntryForm from './TimeEntryForm'
import type { TimeEntry } from '@/types'

type ViewMode = 'day' | 'week' | 'month'

function getWeekDates(anchor: Date) {
  const sunday = startOfWeek(anchor, { weekStartsOn: 0 })
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(sunday, i)
    return { label: format(d, 'EEE M/d'), value: format(d, 'yyyy-MM-dd'), date: d }
  })
}

function getMonthDates(anchor: Date) {
  const start = startOfMonth(anchor)
  const end = endOfMonth(anchor)
  return eachDayOfInterval({ start, end }).map(d => ({
    label: format(d, 'EEE M/d'),
    value: format(d, 'yyyy-MM-dd'),
    date: d,
  }))
}

export default function TimeTab() {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState(today)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Navigation
  const navigate = (dir: -1 | 1) => {
    setAnchor(prev => {
      if (viewMode === 'day') return addDays(prev, dir)
      if (viewMode === 'week') return addWeeks(prev, dir)
      return addMonths(prev, dir)
    })
  }
  const goToday = () => {
    setAnchor(today)
    setSelectedDate(todayStr)
  }

  // Build date tabs based on view
  const dates = viewMode === 'day'
    ? [{ label: format(anchor, 'EEE M/d'), value: format(anchor, 'yyyy-MM-dd'), date: anchor }]
    : viewMode === 'week'
      ? getWeekDates(anchor)
      : getMonthDates(anchor)

  // Keep selectedDate in range
  const dateValues = dates.map(d => d.value)
  const effectiveSelected = dateValues.includes(selectedDate)
    ? selectedDate
    : dateValues.find(v => v === todayStr) || dateValues[0]

  // Week start for chart (always Sunday of the selected date's week)
  const selectedDateObj = new Date(effectiveSelected + 'T12:00:00')
  const weekStart = format(startOfWeek(selectedDateObj, { weekStartsOn: 0 }), 'yyyy-MM-dd')

  // Header title
  const headerTitle = () => {
    if (viewMode === 'day') {
      return format(anchor, 'EEEE, MMMM d, yyyy')
    }
    if (viewMode === 'week') {
      const ws = startOfWeek(anchor, { weekStartsOn: 0 })
      const we = addDays(ws, 6)
      return `${format(ws, 'MMM d')} - ${format(we, 'MMM d, yyyy')}`
    }
    return format(anchor, 'MMMM yyyy')
  }

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
  }

  const handleSaved = () => {
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="space-y-6">
      {/* Single header row: title, nav, view toggle, add button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Time</h1>
            <p className="text-sm text-slate-500">{headerTitle()}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={goToday} className="ml-1 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors">Today</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode)
                  if (mode === 'day') setAnchor(new Date(effectiveSelected + 'T12:00:00'))
                }}
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
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        </div>
      </div>

      {/* Date tabs (week/month views show clickable day pills) */}
      {viewMode !== 'day' && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dates.map(d => {
            const isToday = d.value === todayStr
            return (
              <button key={d.value} onClick={() => setSelectedDate(d.value)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  effectiveSelected === d.value
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : isToday
                      ? 'bg-slate-800/50 border border-emerald-500/20 text-slate-300 hover:border-emerald-500/40'
                      : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}>
                {d.label}
              </button>
            )
          })}
        </div>
      )}

      <DailyTimeline key={`${effectiveSelected}-${refreshKey}`} date={effectiveSelected} onEdit={handleEdit} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><WeeklyChart key={`${weekStart}-${refreshKey}`} weekStart={weekStart} /></div>
        <div><CategoryBreakdown key={`${weekStart}-${refreshKey}`} weekStart={weekStart} /></div>
      </div>
      <TimesheetExportPanel />
      <ProfitabilityTables />
      {showForm && <TimeEntryForm onClose={() => setShowForm(false)} onSaved={handleSaved} />}
      {editingEntry && <TimeEntryForm entry={editingEntry} onClose={() => setEditingEntry(null)} onSaved={handleSaved} />}
    </div>
  )
}
