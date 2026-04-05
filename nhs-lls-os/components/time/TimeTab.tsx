'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import DailyTimeline from './DailyTimeline'
import WeeklyChart from './WeeklyChart'
import CategoryBreakdown from './CategoryBreakdown'
import ProfitabilityTables from './ProfitabilityTables'
import TimeEntryForm from './TimeEntryForm'

const DATES = [
  { label: 'Mon 3/30', value: '2026-03-30' },
  { label: 'Tue 3/31', value: '2026-03-31' },
  { label: 'Wed 4/1',  value: '2026-04-01' },
  { label: 'Thu 4/2',  value: '2026-04-02' },
  { label: 'Fri 4/3',  value: '2026-04-03' },
]

export default function TimeTab() {
  const [selectedDate, setSelectedDate] = useState('2026-04-03')
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Time</h1>
          <p className="text-sm text-slate-500">Week of Mar 30 – Apr 5, 2026</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors">
          <Plus className="w-4 h-4" /> Add Entry
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {DATES.map(d => (
          <button key={d.value} onClick={() => setSelectedDate(d.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedDate === d.value ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}>
            {d.label}
          </button>
        ))}
      </div>
      <DailyTimeline date={selectedDate} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><WeeklyChart /></div>
        <div><CategoryBreakdown /></div>
      </div>
      <ProfitabilityTables />
      {showForm && <TimeEntryForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
