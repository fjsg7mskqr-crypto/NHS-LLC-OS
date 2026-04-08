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
  green: 'text-[oklch(0.75_0.18_145)]',
  blue:  'text-[oklch(0.70_0.15_230)]',
  red:   'text-[oklch(0.65_0.22_25)]',
}
const TONE_DOT: Record<Tone, string> = {
  amber: 'bg-[oklch(0.78_0.17_75)] shadow-[0_0_8px_oklch(0.78_0.17_75)]',
  green: 'bg-[oklch(0.75_0.18_145)] shadow-[0_0_8px_oklch(0.75_0.18_145)]',
  blue:  'bg-[oklch(0.70_0.15_230)] shadow-[0_0_8px_oklch(0.70_0.15_230)]',
  red:   'bg-[oklch(0.65_0.22_25)] shadow-[0_0_8px_oklch(0.65_0.22_25)]',
}

export default function StatCards() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()

  type Card = {
    code: string
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
    { code: 'OPS-101', label: 'ACTIVE OPS',    icon: Briefcase,  tone: 'amber', sub: 'IN PROGRESS',   value: stats?.activeJobs ?? 0 },
    { code: 'TIME-201', label: 'HOURS / CYCLE', icon: Clock,      tone: 'blue',  sub: 'MON–SUN',       value: stats?.hoursThisWeek ?? 0, decimals: 1, suffix: 'h' },
    { code: 'FIN-301', label: 'BILLABLE MTD',  icon: DollarSign, tone: 'green', sub: month,           value: stats?.billableMTD ?? 0, prefix: '$' },
    { code: 'AR-401',  label: 'OUTSTANDING',   icon: FileText,   tone: (stats?.invoicesOutstanding ?? 0) > 0 ? 'red' : 'amber', sub: 'UNPAID',          value: stats?.invoicesOutstanding ?? 0, prefix: '$' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 boot-stagger">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="relative bg-[oklch(0.18_0.02_240/0.6)] border border-slate-700/60 backdrop-blur-sm p-4 hover:border-[oklch(0.78_0.17_75)]/60 hover:bg-[oklch(0.78_0.17_75/0.04)] transition-colors group"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[oklch(0.78_0.17_75)]" />
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[oklch(0.78_0.17_75)]" />
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[oklch(0.78_0.17_75)]" />
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[oklch(0.78_0.17_75)]" />

            <div className="flex items-center justify-between mb-3 font-mono">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 ${TONE_DOT[card.tone]} tactical-pulse`} />
                <span className="text-[9px] tracking-[0.2em] text-slate-500">{card.code}</span>
              </div>
              <Icon className={`w-3.5 h-3.5 ${TONE_TEXT[card.tone]} opacity-80`} />
            </div>

            <div className={`text-3xl font-mono font-bold tabular-nums ${TONE_TEXT[card.tone]}`}>
              {stats === null ? (
                <span className="text-slate-700">— — —</span>
              ) : (
                <CountUp value={card.value} decimals={card.decimals ?? 0} prefix={card.prefix} suffix={card.suffix} />
              )}
            </div>

            <div className="flex items-center justify-between mt-2 font-mono">
              <span className="text-[10px] tracking-[0.15em] text-slate-300">{card.label}</span>
              <span className="text-[9px] tracking-[0.15em] text-slate-600">{card.sub}</span>
            </div>

            {/* sweep line on hover */}
            <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.78_0.17_75)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )
      })}
    </div>
  )
}
