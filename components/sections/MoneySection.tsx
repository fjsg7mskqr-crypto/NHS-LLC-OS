'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import SubTabs from '@/components/ui/SubTabs'
import InvoicesTab from '@/components/invoices/InvoicesTab'
import ReportsTab from '@/components/reports/ReportsTab'

const TABS = [
  { id: 'invoices', label: 'Invoices' },
  { id: 'reports', label: 'Reports' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function MoneySection() {
  const [active, setActive] = useState<TabId>('invoices')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  async function handleSquareSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/square/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncResult(data.error || 'Sync failed')
      } else {
        setSyncResult(`Synced ${data.synced}, skipped ${data.skipped}${data.errors?.length ? `, ${data.errors.length} errors` : ''}`)
        setRefreshKey(k => k + 1)
      }
    } catch {
      setSyncResult('Network error')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncResult(null), 5000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <SubTabs tabs={TABS} active={active} onChange={setActive} />
        {active === 'invoices' && (
          <button
            onClick={handleSquareSync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Square'}
          </button>
        )}
      </div>
      {syncResult && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs text-slate-300">
          {syncResult}
        </div>
      )}
      <div className="tab-content" key={active}>
        {active === 'invoices' && <InvoicesTab key={refreshKey} />}
        {active === 'reports' && <ReportsTab />}
      </div>
    </div>
  )
}
