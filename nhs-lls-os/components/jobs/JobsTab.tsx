'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import JobsList from './JobsList'
import JobDetail from './JobDetail'
import CreateJobModal from './CreateJobModal'
import { MOCK_JOBS } from '@/lib/mock-data'

export default function JobsTab() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const selectedJob = selectedJobId ? MOCK_JOBS.find(j => j.id === selectedJobId) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Jobs</h1>
          <p className="text-sm text-slate-500">{MOCK_JOBS.length} total · {MOCK_JOBS.filter(j => j.status === 'active').length} active</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors">
          <Plus className="w-4 h-4" /> New Job
        </button>
      </div>
      {selectedJob ? <JobDetail job={selectedJob} onBack={() => setSelectedJobId(null)} /> : <JobsList onSelect={setSelectedJobId} />}
      {showCreate && <CreateJobModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
