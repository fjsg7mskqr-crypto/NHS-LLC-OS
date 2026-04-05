'use client'

import { useState, useEffect } from 'react'
import { Play, Square, ChevronDown } from 'lucide-react'
import { MOCK_CLIENTS, MOCK_JOBS } from '@/lib/mock-data'
import { CATEGORY_LABELS } from '@/lib/utils'
import type { CategoryType, ClockSession } from '@/types'

const CATEGORIES: CategoryType[] = ['client_work', 'drive_time', 'errand', 'prep', 'admin']

export default function ClockWidget() {
  const [clockedIn, setClockedIn] = useState(false)
  const [session, setSession] = useState<ClockSession | null>(null)
  const [elapsed, setElapsed] = useState('00:00:00')
  const [category, setCategory] = useState<CategoryType>('client_work')
  const [clientId, setClientId] = useState(MOCK_CLIENTS[0].id)
  const [jobId, setJobId] = useState('')

  const activeJobs = MOCK_JOBS.filter(j => j.status === 'active' && j.client_id === clientId)

  useEffect(() => {
    const stored = localStorage.getItem('nhs_clock_session')
    if (stored) {
      const s: ClockSession = JSON.parse(stored)
      setSession(s); setClockedIn(true); setCategory(s.category); setClientId(s.clientId); setJobId(s.jobId)
    }
  }, [])

  useEffect(() => {
    if (!clockedIn || !session) return
    const timer = setInterval(() => {
      const diff = Date.now() - new Date(session.startTime).getTime()
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000)
      setElapsed(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [clockedIn, session])

  const handleClockIn = () => {
    const now = new Date().toISOString()
    const newSession: ClockSession = { startTime: now, category, clientId, jobId }
    localStorage.setItem('nhs_clock_session', JSON.stringify(newSession))
    setSession(newSession); setClockedIn(true)
    window.dispatchEvent(new CustomEvent('nhs_clock_event', { detail: { action: 'clock_in', startTime: now } }))
  }

  const handleClockOut = () => {
    localStorage.removeItem('nhs_clock_session')
    setSession(null); setClockedIn(false); setElapsed('00:00:00')
    window.dispatchEvent(new CustomEvent('nhs_clock_event', { detail: { action: 'clock_out' } }))
  }

  const clockedInClient = clockedIn ? MOCK_CLIENTS.find(c => c.id === session?.clientId) : null
  const clockedInJob = clockedIn ? MOCK_JOBS.find(j => j.id === session?.jobId) : null

  if (clockedIn) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <div>
            <p className="text-xs text-emerald-400/80 mb-0.5">Clocked in — {CATEGORY_LABELS[session?.category || 'client_work']}</p>
            <p className="font-semibold text-white">
              {clockedInClient?.name}
              {clockedInJob && <span className="text-slate-400 font-normal"> — {clockedInJob.title}</span>}
            </p>
            {session?.startTime && (
              <p className="text-xs text-slate-500 mt-0.5">
                Since {new Date(session.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-3xl font-mono font-bold text-emerald-300 tabular-nums">{elapsed}</span>
          <button onClick={handleClockOut} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors font-medium text-sm">
            <Square className="w-4 h-4 fill-current" /> Clock Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <h2 className="text-sm font-medium text-slate-400 mb-4">Clock In</h2>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Category</label>
          <div className="relative">
            <select value={category} onChange={e => setCategory(e.target.value as CategoryType)} className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer">
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Client</label>
          <div className="relative">
            <select value={clientId} onChange={e => { setClientId(e.target.value); setJobId('') }} className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer">
              <option value="">— No client —</option>
              {MOCK_CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Job (optional)</label>
          <div className="relative">
            <select value={jobId} onChange={e => setJobId(e.target.value)} className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer">
              <option value="">— No job —</option>
              {activeJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <button onClick={handleClockIn} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors">
          <Play className="w-4 h-4 fill-current" /> Clock In
        </button>
      </div>
    </div>
  )
}
