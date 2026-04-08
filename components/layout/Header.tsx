'use client'

import { useEffect, useState } from 'react'
import { LogOut, Wifi, WifiOff, Activity } from 'lucide-react'
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

type HeaderProps = { userEmail: string | null }

function pad(n: number) { return String(n).padStart(2, '0') }

export default function Header({ userEmail }: HeaderProps) {
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
        setElapsed(`${pad(h)}:${pad(m)}:${pad(s)}`)
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

  const localTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const utcTime = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`
  const dateStamp = now.toISOString().slice(0, 10)
  const callsign = userEmail ? userEmail.split('@')[0].toUpperCase() : 'USER'

  return (
    <header className="sticky top-0 z-30 border-b border-slate-700/60 bg-[oklch(0.12_0.02_240/0.95)] backdrop-blur-md">
      {/* top hairline accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-[oklch(0.78_0.17_75)] to-transparent opacity-60" />

      <div className="flex items-center h-14 font-mono">
        {/* Left: brand + system code */}
        <div className="flex items-center gap-3 px-4 border-r border-slate-700/60 h-full">
          <div className="relative w-8 h-8 flex items-center justify-center border border-[oklch(0.78_0.17_75)] bg-[oklch(0.78_0.17_75/0.1)]">
            <span className="absolute -top-px -left-px w-1.5 h-1.5 border-t border-l border-[oklch(0.78_0.17_75)]" />
            <span className="absolute -top-px -right-px w-1.5 h-1.5 border-t border-r border-[oklch(0.78_0.17_75)]" />
            <span className="absolute -bottom-px -left-px w-1.5 h-1.5 border-b border-l border-[oklch(0.78_0.17_75)]" />
            <span className="absolute -bottom-px -right-px w-1.5 h-1.5 border-b border-r border-[oklch(0.78_0.17_75)]" />
            <span className="text-xs font-bold text-[oklch(0.78_0.17_75)]">N</span>
          </div>
          <div className="leading-none">
            <div className="text-[12px] tracking-[0.25em] text-slate-100 font-bold">NHS-LLC OS</div>
            <div className="text-[9px] tracking-[0.2em] text-slate-500 mt-1">v0.2</div>
          </div>
        </div>

        {/* Center: time grid */}
        <div className="hidden md:flex items-center gap-0 h-full border-r border-slate-700/60">
          <TimeBlock label="LOCAL" value={localTime} accent="amber" />
          <TimeBlock label="UTC" value={utcTime} accent="blue" />
          <TimeBlock label="DATE" value={dateStamp} />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: status + clock state + user */}
        <div className="flex items-center h-full">
          <StatusBlock label="STATUS" tone={isSupabaseConfigured ? 'ok' : 'warn'} value={isSupabaseConfigured ? 'ONLINE' : 'DEMO'} icon={isSupabaseConfigured ? Wifi : WifiOff} />
          <StatusBlock
            label="CLOCK"
            tone={clockedIn ? 'ok' : 'standby'}
            value={clockedIn ? elapsed : 'OFF'}
            icon={Activity}
            mono
          />
          <div className="hidden lg:flex flex-col px-4 border-l border-slate-700/60 h-full justify-center">
            <span className="text-[9px] tracking-[0.2em] text-slate-500">USER</span>
            <span className="text-[11px] text-slate-200 tracking-wider">{callsign}</span>
          </div>
          <form action="/auth/logout" method="post" className="h-full">
            <button
              type="submit"
              className="flex items-center gap-2 h-full px-4 border-l border-slate-700/60 text-[10px] tracking-[0.2em] text-slate-400 hover:text-[oklch(0.65_0.22_25)] hover:bg-[oklch(0.65_0.22_25/0.1)] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              SIGN OUT
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}

function TimeBlock({ label, value, accent }: { label: string; value: string; accent?: 'amber' | 'blue' }) {
  const accentColor =
    accent === 'amber' ? 'text-[oklch(0.78_0.17_75)]' :
    accent === 'blue'  ? 'text-[oklch(0.70_0.15_230)]' :
    'text-slate-300'
  return (
    <div className="flex flex-col px-4 h-full justify-center border-l border-slate-700/60">
      <span className="text-[9px] tracking-[0.2em] text-slate-500">{label}</span>
      <span className={`text-[12px] tabular-nums tracking-wider ${accentColor}`}>{value}</span>
    </div>
  )
}

function StatusBlock({
  label,
  value,
  tone,
  icon: Icon,
  mono,
}: {
  label: string
  value: string
  tone: 'ok' | 'warn' | 'alert' | 'standby'
  icon: typeof Wifi
  mono?: boolean
}) {
  const dotMap = {
    ok: 'bg-[oklch(0.75_0.18_145)] shadow-[0_0_8px_oklch(0.75_0.18_145)]',
    warn: 'bg-[oklch(0.78_0.17_75)] shadow-[0_0_8px_oklch(0.78_0.17_75)]',
    alert: 'bg-[oklch(0.65_0.22_25)] shadow-[0_0_8px_oklch(0.65_0.22_25)]',
    standby: 'bg-slate-600',
  }
  const textMap = {
    ok: 'text-[oklch(0.75_0.18_145)]',
    warn: 'text-[oklch(0.78_0.17_75)]',
    alert: 'text-[oklch(0.65_0.22_25)]',
    standby: 'text-slate-500',
  }
  return (
    <div className="hidden sm:flex flex-col px-4 h-full justify-center border-l border-slate-700/60">
      <span className="text-[9px] tracking-[0.2em] text-slate-500 flex items-center gap-1">
        <span className={`w-1.5 h-1.5 ${dotMap[tone]} ${tone !== 'standby' ? 'tactical-pulse' : ''}`} />
        {label}
      </span>
      <span className={`text-[11px] tracking-wider flex items-center gap-1 ${textMap[tone]} ${mono ? 'tabular-nums' : ''}`}>
        <Icon className="w-3 h-3" />
        {value}
      </span>
    </div>
  )
}
