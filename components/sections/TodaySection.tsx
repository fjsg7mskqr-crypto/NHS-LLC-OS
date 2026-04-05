'use client'

import ClockWidget from '@/components/overview/ClockWidget'
import ActiveJobsTable from '@/components/overview/ActiveJobsTable'
import TasksDue from '@/components/overview/TasksDue'
import MiniCalendar from '@/components/overview/MiniCalendar'

export default function TodaySection() {
  return (
    <div className="space-y-6">
      <ClockWidget />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActiveJobsTable />
        </div>
        <div className="space-y-6">
          <TasksDue limit={3} />
          <MiniCalendar />
        </div>
      </div>
    </div>
  )
}
