import ClockWidget from './ClockWidget'
import StatCards from './StatCards'
import ActiveJobsTable from './ActiveJobsTable'
import TasksDue from './TasksDue'
import MiniCalendar from './MiniCalendar'

export default function OverviewTab() {
  return (
    <div className="space-y-6">
      <ClockWidget />
      <StatCards />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ActiveJobsTable />
        </div>
        <div className="space-y-6">
          <TasksDue />
          <MiniCalendar />
        </div>
      </div>
    </div>
  )
}
