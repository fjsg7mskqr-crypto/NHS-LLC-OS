'use client'

import ClockWidget from '@/components/overview/ClockWidget'
import StatCards from '@/components/overview/StatCards'
import ActiveJobsTable from '@/components/overview/ActiveJobsTable'
import TasksDue from '@/components/overview/TasksDue'
import MiniCalendar from '@/components/overview/MiniCalendar'

export default function TodaySection() {
  return (
    <div className="space-y-5">
      <StatCards />

      <ClockWidget />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ActiveJobsTable />
        </div>
        <div className="space-y-5">
          <TasksDue limit={5} />
          <MiniCalendar />
        </div>
      </div>
    </div>
  )
}
