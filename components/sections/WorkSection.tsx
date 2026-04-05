'use client'

import { useState } from 'react'
import SubTabs from '@/components/ui/SubTabs'
import JobsTab from '@/components/jobs/JobsTab'
import TimeTab from '@/components/time/TimeTab'
import ClientsTab from '@/components/clients/ClientsTab'

const TABS = [
  { id: 'jobs', label: 'Jobs' },
  { id: 'time', label: 'Time' },
  { id: 'clients', label: 'Clients' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function WorkSection() {
  const [active, setActive] = useState<TabId>('jobs')

  return (
    <div className="space-y-4">
      <SubTabs tabs={TABS} active={active} onChange={setActive} />
      <div className="tab-content" key={active}>
        {active === 'jobs' && <JobsTab />}
        {active === 'time' && <TimeTab />}
        {active === 'clients' && <ClientsTab />}
      </div>
    </div>
  )
}
