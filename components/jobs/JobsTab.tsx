'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import JobsList from './JobsList'
import JobDetail from './JobDetail'
import CreateJobModal from './CreateJobModal'

export default function JobsTab() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [jobCount, setJobCount] = useState<{ total: number; active: number } | null>(null)
  const [listKey, setListKey] = useState(0)

  useEffect(() => {
    fetch('/api/jobs').then(r => r.json()).then((jobs: any[]) => {
      setJobCount({ total: jobs.length, active: jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length })
    }).catch(() => {})
  }, [listKey])

  const handleSelect = (id: string) => {
    fetch('/api/jobs').then(r => r.json()).then((jobs: any[]) => {
      const job = jobs.find((j: any) => j.id === id)
      if (job) { setSelectedJob(job); setSelectedJobId(id) }
    }).catch(() => {})
  }

  const handleBack = () => { setSelectedJob(null); setSelectedJobId(null) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Jobs</h1>
          <p className="text-sm text-slate-500">{jobCount ? `${jobCount.total} total · ${jobCount.active} active` : 'Loading...'}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors">
          <Plus className="w-4 h-4" /> New Job
        </button>
      </div>
      {selectedJob ? <JobDetail job={selectedJob} onBack={handleBack} /> : <JobsList key={listKey} onSelect={handleSelect} />}
      {showCreate && <CreateJobModal onClose={() => setShowCreate(false)} onCreated={() => setListKey(k => k + 1)} />}
    </div>
  )
}
