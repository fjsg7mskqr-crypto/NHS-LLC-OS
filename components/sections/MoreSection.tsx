'use client'

import { useState } from 'react'
import SubTabs from '@/components/ui/SubTabs'
import CalendarTab from '@/components/calendar/CalendarTab'
import EquipmentTab from '@/components/equipment/EquipmentTab'
import TasksTab from '@/components/tasks/TasksTab'

const TABS = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'tasks', label: 'Tasks' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function MoreSection() {
  const [active, setActive] = useState<TabId>('calendar')

  return (
    <div className="space-y-4">
      <SubTabs tabs={TABS} active={active} onChange={setActive} />
      <div className="tab-content" key={active}>
        {active === 'calendar' && <CalendarTab />}
        {active === 'equipment' && <EquipmentTab />}
        {active === 'tasks' && <TasksTab />}
      </div>
    </div>
  )
}
