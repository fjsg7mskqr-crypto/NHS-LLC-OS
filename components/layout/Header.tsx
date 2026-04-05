'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Activity, Wifi, WifiOff } from 'lucide-react'
import { isSupabaseConfigured } from '@/lib/supabase'

function getStoredClockStart(): Date | null {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem('nhs_clock_session')
  if (!stored) return null

  try {
    const session = JSON.parse(stored) as { startTime?: string }
    return session.startTime ? new Date(session.startTime) : null
  } catch {
    return null
  }
}

export default function Header() {
  const [now, setNow] = useState(new Date())
  const [clockStart, setClockStart] = useState<Date | null>(() => getStoredClockStart())
  const [clockedIn, setClockedIn] = useState(() => getStoredClockStart() !== null)
  const [elapsed, setElapsed] = useState('00:00:00')

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
      if (clockedIn && clockStart) {
        const diff = Date.now() - clockStart.getTime()
        const h = Math.floor(diff / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        setElapsed(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [clockedIn, clockStart])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail.action === 'clock_in') {
        setClockedIn(true)
        setClockStart(new Date(detail.startTime))
      } else if (detail.action === 'clock_out') {
        setClockedIn(false)
        setClockStart(null)
        setElapsed('00:00:00')
      }
    }
    window.addEventListener('nhs_clock_event', handler)
    return () => window.removeEventListener('nhs_clock_event', handler)
  }, [])

  return (
    <header className="sticky top-0 z-20 bg-[#0a0f1a]/95 backdrop-blur-md border-b border-slate-800 header-glow">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center">
            <span className="text-xs font-black text-black">N</span>
          </div>
          <span className="font-semibold text-white tracking-tight">NHS-LLC OS</span>
        </div>

        <span className="hidden sm:block text-sm text-slate-400 font-medium">
          {format(now, 'EEEE, MMMM d, yyyy')}
        </span>

        <div className="flex items-center gap-3">
          {isSupabaseConfigured ? (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400">
              <Wifi className="w-3.5 h-3.5" /> Live
            </span>
          ) : (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400">
              <WifiOff className="w-3.5 h-3.5" /> Demo
            </span>
          )}
          {clockedIn ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-sm font-mono text-emerald-300 font-medium">{elapsed}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-xs text-slate-500">Not clocked in</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
