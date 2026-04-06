'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatMinutes } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'
import type { Client, Job, Invoice, TimeEntry, SquareInvoice } from '@/types'

function BarChart({ items, colorClass }: { items: { label: string; value: number; display: string }[]; colorClass: string }) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-slate-400 w-28 truncate text-right flex-shrink-0">{item.label}</span>
          <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
          <span className="text-xs text-slate-300 w-20 flex-shrink-0">{item.display}</span>
        </div>
      ))}
    </div>
  )
}

export default function ReportsTab() {
  const [clients, setClients] = useState<Client[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [squareInvoices, setSquareInvoices] = useState<SquareInvoice[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      setError(null)
      try {
        const [cli, jbs, invs, sqInvs, te] = await Promise.all([
          fetch('/api/clients').then(r => r.ok ? r.json() : []),
          fetch('/api/jobs').then(r => r.ok ? r.json() : []),
          fetch('/api/invoices').then(r => r.ok ? r.json() : []),
          fetch('/api/square-invoices').then(r => r.ok ? r.json() : []),
          fetch('/api/time-entries').then(r => r.ok ? r.json() : []),
        ])
        setClients(Array.isArray(cli) ? cli : [])
        setJobs(Array.isArray(jbs) ? jbs : [])
        setInvoices(Array.isArray(invs) ? invs : [])
        setSquareInvoices(Array.isArray(sqInvs) ? sqInvs : [])
        setTimeEntries(Array.isArray(te) ? te : [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="py-12 text-center text-slate-500 text-sm">Loading reports...</div>

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  // Helper for Square paid date
  const sqDate = (i: SquareInvoice) => i.paid_date || i.due_date || i.issued_date || ''

  // Revenue metrics — combine manual + Square
  const manualPaidTotal = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const squarePaidTotal = squareInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount_paid), 0)
  const totalRevenue = manualPaidTotal + squarePaidTotal

  const ytdRevenue =
    invoices.filter(i => i.status === 'paid' && i.updated_at >= yearStart).reduce((s, i) => s + i.total, 0) +
    squareInvoices.filter(i => i.status === 'paid' && sqDate(i) >= yearStart).reduce((s, i) => s + Number(i.amount_paid), 0)

  const monthRevenue =
    invoices.filter(i => i.status === 'paid' && i.updated_at >= monthStart).reduce((s, i) => s + i.total, 0) +
    squareInvoices.filter(i => i.status === 'paid' && sqDate(i) >= monthStart).reduce((s, i) => s + Number(i.amount_paid), 0)

  const outstanding =
    invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0) +
    squareInvoices.filter(i => i.status === 'unpaid' || i.status === 'overdue' || i.status === 'partially_paid').reduce((s, i) => s + Number(i.amount_due), 0)

  // Revenue by client — combine both sources
  const revenueByClient: Record<string, number> = {}
  for (const inv of invoices.filter(i => i.status === 'paid')) {
    const name = inv.client?.name || 'Unknown'
    revenueByClient[name] = (revenueByClient[name] || 0) + inv.total
  }
  for (const inv of squareInvoices.filter(i => i.status === 'paid')) {
    const name = inv.client?.name || 'Unmatched'
    revenueByClient[name] = (revenueByClient[name] || 0) + Number(inv.amount_paid)
  }
  const clientRevenueItems = Object.entries(revenueByClient)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value, display: formatCurrency(value) }))

  // Job completion stats
  const totalJobs = jobs.length
  const completed = jobs.filter(j => j.status === 'complete').length
  const active = jobs.filter(j => j.status === 'in_progress' || j.status === 'scheduled').length
  const cancelled = jobs.filter(j => j.status === 'cancelled').length
  const completionRate = totalJobs > 0 ? Math.round((completed / totalJobs) * 100) : 0

  // Time utilization
  const totalMinutes = timeEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const billableMinutes = timeEntries.filter(e => e.billable).reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const utilization = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0
  const totalBilledAmount = timeEntries.filter(e => e.billable).reduce((s, e) => s + (e.billable_amount || 0), 0)

  // Hours by category
  const hoursByCategory: Record<string, number> = {}
  for (const entry of timeEntries) {
    const cat = entry.category || 'other'
    hoursByCategory[cat] = (hoursByCategory[cat] || 0) + (entry.duration_minutes || 0)
  }
  const categoryItems = Object.entries(hoursByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label: label.replace('_', ' '), value, display: formatMinutes(value) }))

  // Monthly revenue trend (last 6 months) — combine both sources
  const monthlyRevenue: { label: string; value: number; display: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const manualVal = invoices
      .filter(inv => inv.status === 'paid' && inv.updated_at.startsWith(ms))
      .reduce((s, inv) => s + inv.total, 0)
    const squareVal = squareInvoices
      .filter(inv => inv.status === 'paid' && sqDate(inv).startsWith(ms))
      .reduce((s, inv) => s + Number(inv.amount_paid), 0)
    monthlyRevenue.push({ label, value: manualVal + squareVal, display: formatCurrency(manualVal + squareVal) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Reports</h1>
        <p className="text-sm text-slate-500">
          {clients.length} clients · {jobs.length} jobs · {invoices.length + squareInvoices.length} invoices
        </p>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Top-level metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
        <div className="metric-card metric-card--emerald rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Revenue (All Time)</p>
          <p className="text-lg font-semibold text-emerald-400 glow-emerald">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="metric-card metric-card--blue rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">YTD Revenue</p>
          <p className="text-lg font-semibold text-blue-400 glow-blue">{formatCurrency(ytdRevenue)}</p>
        </div>
        <div className="metric-card metric-card--amber rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Outstanding</p>
          <p className="text-lg font-semibold text-amber-400 glow-amber">{formatCurrency(outstanding)}</p>
        </div>
        <div className="metric-card metric-card--emerald rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">This Month</p>
          <p className="text-lg font-semibold text-emerald-400 glow-emerald">{formatCurrency(monthRevenue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Monthly Revenue (Last 6 Months)</h3>
          <BarChart items={monthlyRevenue} colorClass="bg-emerald-500" />
        </div>

        {/* Revenue by Client */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Revenue by Client</h3>
          {clientRevenueItems.length === 0 ? (
            <p className="text-xs text-slate-500">No paid invoices yet</p>
          ) : (
            <BarChart items={clientRevenueItems} colorClass="bg-blue-500" />
          )}
        </div>

        {/* Job Completion Stats */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Job Completion</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-2xl font-bold text-emerald-400">{completionRate}%</p>
              <p className="text-xs text-slate-500">Completion Rate</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Completed</span>
                <span className="text-slate-200">{completed}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Active</span>
                <span className="text-slate-200">{active}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Cancelled</span>
                <span className="text-slate-200">{cancelled}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total</span>
                <span className="text-white font-medium">{totalJobs}</span>
              </div>
            </div>
          </div>
          {totalJobs > 0 ? (
            <>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                {completed > 0 && <div className="h-full bg-emerald-500" style={{ width: `${(completed / totalJobs) * 100}%` }} />}
                {active > 0 && <div className="h-full bg-blue-500" style={{ width: `${(active / totalJobs) * 100}%` }} />}
                {cancelled > 0 && <div className="h-full bg-slate-600" style={{ width: `${(cancelled / totalJobs) * 100}%` }} />}
              </div>
              <div className="flex gap-4 mt-2">
                <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-emerald-500" />Complete</span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-blue-500" />Active</span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-600" />Cancelled</span>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">No jobs yet</p>
          )}
        </div>

        {/* Time Utilization */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Time Utilization</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-2xl font-bold text-blue-400">{utilization}%</p>
              <p className="text-xs text-slate-500">Billable Rate</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total Hours</span>
                <span className="text-slate-200">{formatMinutes(totalMinutes)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Billable Hours</span>
                <span className="text-slate-200">{formatMinutes(billableMinutes)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Billed Amount</span>
                <span className="text-emerald-400">{formatCurrency(totalBilledAmount)}</span>
              </div>
            </div>
          </div>
          <h4 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">Hours by Category</h4>
          {categoryItems.length === 0 ? (
            <p className="text-xs text-slate-500">No time entries yet</p>
          ) : (
            <BarChart items={categoryItems} colorClass="bg-violet-500" />
          )}
        </div>
      </div>
    </div>
  )
}
