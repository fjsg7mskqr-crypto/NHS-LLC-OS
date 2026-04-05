import { Briefcase, Clock, DollarSign, CreditCard } from 'lucide-react'
import { getWeeklyStats } from '@/lib/mock-data'
import { formatCurrency, formatHours } from '@/lib/utils'

export default function StatCards() {
  const stats = getWeeklyStats()
  const cards = [
    { label: 'Active Jobs', value: stats.activeJobs.toString(), icon: Briefcase, color: 'text-emerald-400', bg: 'bg-emerald-500/10', sub: 'currently in progress' },
    { label: 'Hours This Week', value: formatHours(stats.hoursThisWeek), icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', sub: 'Mon–Sun' },
    { label: 'Billable MTD', value: formatCurrency(stats.billableMTD), icon: DollarSign, color: 'text-violet-400', bg: 'bg-violet-500/10', sub: 'April 2026' },
    { label: 'Square Unpaid', value: formatCurrency(stats.squareUnpaid), icon: CreditCard, color: 'text-amber-400', bg: 'bg-amber-500/10', sub: '3 invoices outstanding' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div key={card.label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
