'use client'

import { useState } from 'react'
import { LayoutDashboard, Clock, Briefcase, FileText } from 'lucide-react'
import clsx from 'clsx'
import OverviewTab from '@/components/overview/OverviewTab'
import TimeTab from '@/components/time/TimeTab'
import JobsTab from '@/components/jobs/JobsTab'
import InvoicesTab from '@/components/invoices/InvoicesTab'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'time', label: 'Time', icon: Clock },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'invoices', label: 'Invoices', icon: FileText },
] as const

type TabId = (typeof TABS)[number]['id']

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div className="flex flex-col min-h-full">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-[#0a0f1a]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="tab-content" key={activeTab}>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'time' && <TimeTab />}
          {activeTab === 'jobs' && <JobsTab />}
          {activeTab === 'invoices' && <InvoicesTab />}
        </div>
      </div>
    </div>
  )
}
