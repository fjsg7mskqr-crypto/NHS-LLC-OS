'use client'

import { useState, useEffect } from 'react'
import { Plus, CheckCircle, Circle, Trash2, ChevronDown } from 'lucide-react'
import { formatDate, priorityColor } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'
import CreateTaskModal from './CreateTaskModal'
import type { Task, Priority } from '@/types'

export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [listKey, setListKey] = useState(0)
  const [showCompleted, setShowCompleted] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      setError(null)
      try {
        const url = showCompleted ? '/api/tasks?show_completed=true' : '/api/tasks'
        const r = await fetch(url)
        if (!r.ok) throw new Error('Failed to load tasks')
        const data: Task[] = await r.json()
        setTasks(data || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tasks')
      } finally {
        setLoading(false)
      }
    })()
  }, [listKey, showCompleted])

  const toggleComplete = async (task: Task) => {
    setUpdating(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, completed: !task.completed }),
      })
      if (res.ok) setListKey(k => k + 1)
    } catch {}
    setUpdating(false)
  }

  const handleDelete = async (id: string) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' })
      if (res.ok) { setConfirmDeleteId(null); setListKey(k => k + 1) }
    } catch {}
    setUpdating(false)
  }

  const filtered = tasks.filter(t => {
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    return true
  })

  const pending = tasks.filter(t => !t.completed)
  const highPriority = pending.filter(t => t.priority === 'high').length
  const overdue = pending.filter(t => t.due_date && t.due_date < new Date().toISOString().slice(0, 10)).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-slate-500">{loading ? 'Loading...' : `${pending.length} pending`}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
        <div className="metric-card metric-card--blue rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Pending</p>
          <p className="text-lg font-semibold text-blue-400 glow-blue">{pending.length}</p>
        </div>
        <div className="metric-card metric-card--red rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">High Priority</p>
          <p className="text-lg font-semibold text-red-400 glow-red">{highPriority}</p>
        </div>
        <div className="metric-card metric-card--amber rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Overdue</p>
          <p className="text-lg font-semibold text-amber-400 glow-amber">{overdue}</p>
        </div>
        <div className="metric-card metric-card--emerald rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 mb-1">Completed</p>
          <p className="text-lg font-semibold text-emerald-400 glow-emerald">{tasks.filter(t => t.completed).length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap gap-3 items-center">
          <div className="relative">
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as Priority | 'all')} className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer">
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer ml-auto">
            <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0" />
            <span className="text-sm text-slate-400">Show completed</span>
          </label>
        </div>

        <div className="divide-y divide-slate-800/50">
          {filtered.map(task => {
            const isOverdue = !task.completed && task.due_date && task.due_date < new Date().toISOString().slice(0, 10)
            return (
              <div
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => setEditingTask(task)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setEditingTask(task)
                  }
                }}
                className={`px-5 py-3.5 flex items-center gap-3 hover:bg-slate-800/40 transition-colors group cursor-pointer ${task.completed ? 'opacity-50' : ''}`}
              >
                <button
                  onClick={e => { e.stopPropagation(); toggleComplete(task) }}
                  disabled={updating}
                  aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                  className="flex-shrink-0 text-slate-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
                >
                  {task.completed ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200 group-hover:text-emerald-300'} transition-colors`}>{task.title}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${priorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {task.client && <span className="text-xs text-slate-500">{task.client.name}</span>}
                    {task.job && <span className="text-xs text-slate-600">/ {task.job.title}</span>}
                    {task.due_date && (
                      <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
                        Due {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {confirmDeleteId === task.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={e => { e.stopPropagation(); handleDelete(task.id) }} disabled={updating} className="px-2 py-1 rounded text-xs bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 disabled:opacity-50">Yes</button>
                      <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(null) }} className="px-2 py-1 rounded text-xs border border-slate-700 text-slate-400">No</button>
                    </div>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(task.id) }} aria-label="Delete task" className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {loading && <div className="py-12 text-center text-slate-500 text-sm">Loading tasks...</div>}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-slate-700 empty-state-icon" />
            {showCompleted ? 'No tasks match your filters' : 'All caught up!'}
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-800">
          <p className="text-xs text-slate-600">{filtered.length} tasks shown</p>
        </div>
      </div>

      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); setListKey(k => k + 1) }}
        />
      )}

      {editingTask && (
        <CreateTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onCreated={() => { setEditingTask(null); setListKey(k => k + 1) }}
        />
      )}
    </div>
  )
}
