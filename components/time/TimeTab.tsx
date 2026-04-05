'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { startOfWeek, addDays, format } from 'date-fns'
import DailyTimeline from './DailyTimeline'
import WeeklyChart from './WeeklyChart'
import CategoryBreakdown from './CategoryBreakdown'
import ProfitabilityTables from './ProfitabilityTables'
import TimesheetExportPanel from './TimesheetExportPanel'
import TimeEntryForm from './TimeEntryForm'

function getWeekDates() {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  return Array.from({ length: 5 }, (_, i) => {
    const d = addDays(monday, i)
    return { label: format(d, 'EEE M/d'), value: format(d, 'yyyy-MM-dd') }
  })
}

export default function TimeTab() {
  const dates = getWeekDates()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const defaultDate = dates.find(d => d.value === todayStr)?.value || dates[dates.length - 1].value
  const weekStart = dates[0].value

  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Time</h1>
          <p className="text-sm text-slate-500">Week of {format(new Date(weekStart + 'T12:00:00'), 'MMM d, yyyy')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors">
          <Plus className="w-4 h-4" /> Add Entry
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dates.map(d => (
          <button key={d.value} onClick={() => setSelectedDate(d.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedDate === d.value ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}>
            {d.label}
          </button>
        ))}
      </div>
      <DailyTimeline date={selectedDate} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><WeeklyChart weekStart={weekStart} /></div>
        <div><CategoryBreakdown weekStart={weekStart} /></div>
      </div>
      <TimesheetExportPanel />
      <ProfitabilityTables />
      {showForm && <TimeEntryForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
