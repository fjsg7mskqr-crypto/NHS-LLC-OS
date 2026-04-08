'use client'

import { useEffect, useState } from 'react'

type TickerItem = { text: string; tone?: 'amber' | 'green' | 'blue' | 'red' }

const TONE: Record<NonNullable<TickerItem['tone']>, string> = {
  amber: 'text-[oklch(0.78_0.17_75)]',
  green: 'text-[oklch(0.75_0.18_145)]',
  blue: 'text-[oklch(0.70_0.15_230)]',
  red: 'text-[oklch(0.65_0.22_25)]',
}

export default function TelemetryTicker() {
  const [items, setItems] = useState<TickerItem[]>([
    { text: 'NHS-LLC OS online', tone: 'green' },
    { text: 'Loading data...', tone: 'amber' },
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
        const next: TickerItem[] = []
        if (statsRes) {
          next.push({ text: `${statsRes.activeJobs ?? 0} active jobs`, tone: 'amber' })
          next.push({ text: `${(statsRes.hoursThisWeek ?? 0).toFixed(1)} hours logged this week`, tone: 'blue' })
          next.push({ text: `$${Math.round(statsRes.billableMTD ?? 0).toLocaleString()} billable this month`, tone: 'green' })
          if ((statsRes.invoicesOutstanding ?? 0) > 0) {
            next.push({ text: `$${Math.round(statsRes.invoicesOutstanding).toLocaleString()} outstanding`, tone: 'red' })
          }
        }
        if (Array.isArray(jobsRes)) {
          for (const j of jobsRes.slice(0, 3)) {
            next.push({ text: `${j.title || 'Untitled job'} — in progress`, tone: 'amber' })
          }
        }
        if (next.length === 0) next.push({ text: 'All systems online', tone: 'green' })
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
          <span className="text-[10px] tracking-[0.2em] text-[oklch(0.78_0.17_75)] font-mono">LIVE</span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="ticker-track flex gap-8 whitespace-nowrap py-1">
            {doubled.map((it, i) => (
              <span key={i} className="flex items-center gap-2 text-[11px] font-mono">
                <span className={TONE[it.tone || 'amber']}>{it.text}</span>
                <span className="text-slate-700">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
