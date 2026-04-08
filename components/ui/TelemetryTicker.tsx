'use client'

import { useEffect, useState } from 'react'

type TickerItem = { code: string; text: string; tone?: 'amber' | 'green' | 'blue' | 'red' }

const TONE: Record<NonNullable<TickerItem['tone']>, string> = {
  amber: 'text-[oklch(0.78_0.17_75)]',
  green: 'text-[oklch(0.75_0.18_145)]',
  blue: 'text-[oklch(0.70_0.15_230)]',
  red: 'text-[oklch(0.65_0.22_25)]',
}

export default function TelemetryTicker() {
  const [items, setItems] = useState<TickerItem[]>([
    { code: 'SYS', text: 'NHS-LLC OS ONLINE', tone: 'green' },
    { code: 'NET', text: 'SUPABASE LINK ESTABLISHED', tone: 'blue' },
    { code: 'OPS', text: 'AWAITING TELEMETRY', tone: 'amber' },
  ])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [statsRes, jobsRes] = await Promise.all([
          fetch('/api/stats').then(r => r.json()).catch(() => null),
          fetch('/api/jobs?status=in_progress').then(r => r.json()).catch(() => []),
        ])
        if (cancelled) return
        const next: TickerItem[] = [
          { code: 'SYS', text: `NHS-LLC OS // BUILD ${process.env.NEXT_PUBLIC_BUILD_ID || '0.2.0'} // OPERATIONAL`, tone: 'green' },
        ]
        if (statsRes) {
          next.push({ code: 'OPS', text: `${statsRes.activeJobs ?? 0} ACTIVE OPERATIONS`, tone: 'amber' })
          next.push({ code: 'TIME', text: `${(statsRes.hoursThisWeek ?? 0).toFixed(1)} HRS LOGGED THIS CYCLE`, tone: 'blue' })
          next.push({ code: 'FIN', text: `$${Math.round(statsRes.billableMTD ?? 0).toLocaleString()} BILLABLE MTD`, tone: 'green' })
          if ((statsRes.invoicesOutstanding ?? 0) > 0) {
            next.push({ code: 'AR', text: `$${Math.round(statsRes.invoicesOutstanding).toLocaleString()} OUTSTANDING`, tone: 'red' })
          }
        }
        if (Array.isArray(jobsRes)) {
          for (const j of jobsRes.slice(0, 3)) {
            next.push({ code: 'JOB', text: `${(j.title || 'UNTITLED').toUpperCase()} // IN PROGRESS`, tone: 'amber' })
          }
        }
        next.push({ code: 'NET', text: 'ALL CHANNELS NOMINAL', tone: 'blue' })
        setItems(next)
      } catch {}
    }
    load()
    const id = setInterval(load, 60000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const doubled = [...items, ...items]

  return (
    <div className="sticky bottom-0 z-20 border-t border-slate-700/60 bg-[oklch(0.12_0.02_240/0.95)] backdrop-blur-md overflow-hidden">
      <div className="flex items-center h-7">
        <div className="flex items-center gap-2 px-3 border-r border-slate-700/60 h-full bg-[oklch(0.78_0.17_75/0.12)] flex-shrink-0">
          <span className="w-1.5 h-1.5 bg-[oklch(0.78_0.17_75)] tactical-pulse" />
          <span className="text-[10px] tracking-[0.2em] text-[oklch(0.78_0.17_75)] font-mono">TELEMETRY</span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="ticker-track flex gap-8 whitespace-nowrap py-1">
            {doubled.map((it, i) => (
              <span key={i} className="flex items-center gap-2 text-[10px] font-mono tracking-wider">
                <span className="text-slate-600">[{it.code}]</span>
                <span className={TONE[it.tone || 'amber']}>{it.text}</span>
                <span className="text-slate-700">▸</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
