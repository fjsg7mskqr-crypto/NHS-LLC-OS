'use client'

import { useState, useEffect } from 'react'
import { Play, Square, ChevronDown } from 'lucide-react'
import { CATEGORY_LABELS } from '@/lib/utils'
import type { CategoryType, ClockSession, Client, Job, Property } from '@/types'

const CATEGORIES: CategoryType[] = ['client_work', 'drive_time', 'prep', 'admin', 'equipment_maint']

function getStoredClockSession(): ClockSession | null {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem('nhs_clock_session')
  if (!stored) return null

  try {
    return JSON.parse(stored) as ClockSession
  } catch {
    return null
  }
}

export default function ClockWidget() {
  const [session, setSession] = useState<ClockSession | null>(() => getStoredClockSession())
  const [clockedIn, setClockedIn] = useState(() => getStoredClockSession() !== null)
  const [elapsed, setElapsed] = useState('00:00:00')
  const [category, setCategory] = useState<CategoryType>(() => getStoredClockSession()?.category || 'client_work')
  const [clientId, setClientId] = useState(() => getStoredClockSession()?.clientId || '')
  const [propertyId, setPropertyId] = useState(() => getStoredClockSession()?.propertyId || '')
  const [jobId, setJobId] = useState(() => getStoredClockSession()?.jobId || '')
  const [clients, setClients] = useState<Client[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(data => {
      setClients(data || [])
    }).catch(() => {})
    fetch('/api/properties').then(r => r.json()).then(data => {
      setProperties(data || [])
    }).catch(() => {})
    fetch('/api/jobs?status=in_progress').then(r => r.json()).then(data => {
      setJobs(data || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!clockedIn || !session) return
    const timer = setInterval(() => {
      const diff = Date.now() - new Date(session.startTime).getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setElapsed(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [clockedIn, session])

  const clientProperties = properties.filter(p => p.client_id === clientId)
  const activeJobs = jobs.filter(j => j.client_id === clientId)

  const handleClockIn = () => {
    const now = new Date().toISOString()
    const newSession: ClockSession = { startTime: now, category, clientId, propertyId, jobId }
    localStorage.setItem('nhs_clock_session', JSON.stringify(newSession))
    setSession(newSession)
    setClockedIn(true)
    window.dispatchEvent(new CustomEvent('nhs_clock_event', { detail: { action: 'clock_in', startTime: now } }))
  }

  const handleClockOut = async () => {
    if (!session || saving) return
    setSaving(true)
    const endTime = new Date().toISOString()
    const clockedInClient = clients.find(c => c.id === session.clientId)
    const billable = session.category === 'client_work'
    const hourlyRate = clockedInClient?.default_hourly_rate ?? null

    try {
      await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: session.jobId || null,
          client_id: session.clientId || null,
          property_id: session.propertyId || null,
          category: session.category,
          start_time: session.startTime,
          end_time: endTime,
          billable,
          hourly_rate: billable ? hourlyRate : null,
          source: 'dashboard',
        }),
      })
    } catch {}

    localStorage.removeItem('nhs_clock_session')
    setSession(null)
    setClockedIn(false)
    setElapsed('00:00:00')
    setSaving(false)
    window.dispatchEvent(new CustomEvent('nhs_clock_event', { detail: { action: 'clock_out' } }))
  }

  const clockedInClient = clockedIn ? clients.find(c => c.id === session?.clientId) : null
  const clockedInProperty = clockedIn ? properties.find(p => p.id === session?.propertyId) : null
  const clockedInJob = clockedIn ? jobs.find(j => j.id === session?.jobId) : null

  // ─── PRESENTATION ─────────────────────────────────────────────────────
  // Tactical HUD shell. Logic above is untouched (sacred).

  const FRAME = 'relative bg-[oklch(0.18_0.02_240/0.6)] border border-slate-700/60 backdrop-blur-sm'

  if (clockedIn) {
    return (
      <div className={`${FRAME} font-mono`}>
        <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t border-l border-[oklch(0.78_0.17_75)]" />
        <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t border-r border-[oklch(0.78_0.17_75)]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[oklch(0.78_0.17_75)]" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[oklch(0.78_0.17_75)]" />
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/60 bg-slate-900/40">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[oklch(0.75_0.18_145)] shadow-[0_0_8px_oklch(0.75_0.18_145)] tactical-pulse" />
            <span className="text-[10px] tracking-[0.2em] text-[oklch(0.75_0.18_145)]">ON DUTY</span>
            <span className="text-[10px] tracking-[0.2em] text-slate-600">{'// CLK-001'}</span>
          </div>
          <span className="text-[10px] tracking-[0.2em] text-slate-500">[ {CATEGORY_LABELS[session?.category || 'client_work'].toUpperCase()} ]</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-6 px-6 py-6">
          <div className="min-w-0">
            <div className="text-[9px] tracking-[0.25em] text-slate-600 mb-2">▸ ACTIVE TARGET</div>
            <p className="text-lg text-slate-100 uppercase tracking-wide truncate">
              {clockedInClient?.name || 'NO CLIENT'}
              {clockedInProperty && <span className="text-slate-500"> {'// '}{clockedInProperty.name}</span>}
            </p>
            {clockedInJob && (
              <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide truncate">▸ {clockedInJob.title}</p>
            )}
            {session?.startTime && (
              <p className="text-[10px] tracking-[0.2em] text-slate-600 mt-2">
                {'T0 // '}{new Date(session.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </p>
            )}
          </div>
          <div className="flex flex-col items-center sm:items-end gap-3">
            <div className="text-[9px] tracking-[0.25em] text-slate-600">ELAPSED</div>
            <div className="text-5xl sm:text-6xl font-mono font-bold tabular-nums text-[oklch(0.78_0.17_75)] drop-shadow-[0_0_18px_oklch(0.78_0.17_75/0.4)] leading-none">
              {elapsed}
            </div>
            <button
              onClick={handleClockOut}
              disabled={saving}
              className="mt-1 flex items-center gap-2 px-4 py-2 border border-[oklch(0.65_0.22_25)] bg-[oklch(0.65_0.22_25/0.1)] text-[oklch(0.65_0.22_25)] hover:bg-[oklch(0.65_0.22_25/0.2)] transition-colors text-[11px] tracking-[0.2em] disabled:opacity-50"
            >
              <Square className="w-3 h-3 fill-current" />
              {saving ? 'TRANSMITTING...' : '[ DISENGAGE ]'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const SELECT_CLS = 'appearance-none pl-3 pr-8 py-2 bg-slate-900/60 border border-slate-700/60 text-[11px] text-slate-200 font-mono tracking-wider uppercase focus:outline-none focus:border-[oklch(0.78_0.17_75)] cursor-pointer'

  return (
    <div className={`${FRAME} font-mono`}>
      <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t border-l border-[oklch(0.78_0.17_75)]" />
      <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t border-r border-[oklch(0.78_0.17_75)]" />
      <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[oklch(0.78_0.17_75)]" />
      <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[oklch(0.78_0.17_75)]" />
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/60 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-slate-600" />
          <span className="text-[10px] tracking-[0.2em] text-slate-500">STANDBY</span>
          <span className="text-[10px] tracking-[0.2em] text-slate-600">{'// CLK-001'}</span>
        </div>
        <span className="text-[10px] tracking-[0.2em] text-slate-600">[ AWAITING ENGAGEMENT ]</span>
      </div>
      <div className="px-5 py-5">
        <div className="text-[9px] tracking-[0.25em] text-slate-600 mb-3">▸ MISSION PARAMETERS</div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] tracking-[0.2em] text-slate-600">CATEGORY</label>
            <div className="relative">
              <select value={category} onChange={e => setCategory(e.target.value as CategoryType)} className={SELECT_CLS}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] tracking-[0.2em] text-slate-600">CLIENT</label>
            <div className="relative">
              <select value={clientId} onChange={e => { setClientId(e.target.value); setPropertyId(''); setJobId('') }} className={SELECT_CLS}>
                <option value="">— NONE —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>
          {clientId && clientProperties.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-[9px] tracking-[0.2em] text-slate-600">SITE</label>
              <div className="relative">
                <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className={SELECT_CLS}>
                  <option value="">— NONE —</option>
                  {clientProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] tracking-[0.2em] text-slate-600">JOB</label>
            <div className="relative">
              <select value={jobId} onChange={e => setJobId(e.target.value)} className={SELECT_CLS}>
                <option value="">— NONE —</option>
                {activeJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>
          <button
            onClick={handleClockIn}
            className="flex items-center gap-2 px-5 py-2 border border-[oklch(0.78_0.17_75)] bg-[oklch(0.78_0.17_75/0.12)] text-[oklch(0.78_0.17_75)] hover:bg-[oklch(0.78_0.17_75/0.25)] transition-colors text-[11px] tracking-[0.2em]"
          >
            <Play className="w-3 h-3 fill-current" /> [ ENGAGE ]
          </button>
        </div>
      </div>
    </div>
  )
}
