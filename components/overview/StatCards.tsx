'use client'

import { useEffect, useState } from 'react'
import { Briefcase, Clock, DollarSign, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import CountUp from '@/components/ui/CountUp'

interface Stats {
  activeJobs: number
  hoursThisWeek: number
  billableMTD: number
  invoicesOutstanding: number
}

type Tone = 'amber' | 'green' | 'blue' | 'red'

const TONE_TEXT: Record<Tone, string> = {
  amber: 'text-[oklch(0.78_0.17_75)]',
  green: 'text-emerald-400',
  blue:  'text-sky-400',
  red:   'text-red-400',
}

export default function StatCards() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  const month = new Date().toLocaleString('en-US', { month: 'short' })

  type Card = {
    label: string
    icon: LucideIcon
    tone: Tone
    sub: string
    value: number
    decimals?: number
    prefix?: string
    suffix?: string
  }

  const cards: Card[] = [
    { label: 'Active jobs',     icon: Briefcase,  tone: 'amber', sub: 'In progress',          value: stats?.activeJobs ?? 0 },
    { label: 'Hours this week', icon: Clock,      tone: 'blue',  sub: 'Mon–Sun',              value: stats?.hoursThisWeek ?? 0, decimals: 1, suffix: 'h' },
    { label: 'Billable MTD',    icon: DollarSign, tone: 'green', sub: month,                  value: stats?.billableMTD ?? 0, prefix: '$' },
    { label: 'Outstanding',     icon: FileText,   tone: (stats?.invoicesOutstanding ?? 0) > 0 ? 'red' : 'amber', sub: 'Unpaid', value: stats?.invoicesOutstanding ?? 0, prefix: '$' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">{card.label}</span>
              <Icon className={`w-4 h-4 ${TONE_TEXT[card.tone]} opacity-70`} />
            </div>
            <div className={`text-3xl font-mono font-semibold tabular-nums ${TONE_TEXT[card.tone]}`}>
              {stats === null ? (
                <span className="text-slate-700">—</span>
              ) : (
                <CountUp value={card.value} decimals={card.decimals ?? 0} prefix={card.prefix} suffix={card.suffix} />
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">{card.sub}</div>
          </div>
        )
      })}
    </div>
  )
}
