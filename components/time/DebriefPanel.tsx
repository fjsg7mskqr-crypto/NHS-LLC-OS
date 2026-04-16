'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
import type { Debrief, DebriefContext } from '@/types'

type Props = { date: string }

type Field = 'summary' | 'wins' | 'blockers' | 'followups'

const FIELD_LABELS: Record<Exclude<Field, 'summary'>, string> = {
  wins: 'Wins',
  blockers: 'Blockers',
  followups: 'Follow-ups',
}

export default function DebriefPanel({ date }: Props) {
  const [, setDebrief] = useState<Debrief | null>(null)
  const [context, setContext] = useState<DebriefContext | null>(null)
  const [values, setValues] = useState({ summary: '', wins: '', blockers: '', followups: '' })
  const [expanded, setExpanded] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLoadedDate = useRef<string | null>(null)

  // Load debrief + context when date changes
  useEffect(() => {
    let cancelled = false
    fetch(`/api/debriefs?date=${date}&include_context=true`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const d: Debrief | null = data?.debrief ?? null
        setDebrief(d)
        setContext(data?.context ?? null)
        setValues({
          summary: d?.summary || '',
          wins: d?.wins || '',
          blockers: d?.blockers || '',
          followups: d?.followups || '',
        })
        setSavedAt(d?.updated_at || null)
        lastLoadedDate.current = date
      })
      .catch(() => {
        if (cancelled) return
        setDebrief(null)
        setContext(null)
        setValues({ summary: '', wins: '', blockers: '', followups: '' })
        setSavedAt(null)
      })
    return () => { cancelled = true }
  }, [date])

  const persist = useCallback(async (next: typeof values) => {
    setSaving(true)
    try {
      const res = await fetch('/api/debriefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          summary: next.summary || null,
          wins: next.wins || null,
          blockers: next.blockers || null,
          followups: next.followups || null,
          append: false,
        }),
      })
      if (res.ok) {
        const saved: Debrief = await res.json()
        setDebrief(saved)
        setSavedAt(saved.updated_at)
      }
    } finally {
      setSaving(false)
    }
  }, [date])

  const handleChange = (field: Field, value: string) => {
    const next = { ...values, [field]: value }
    setValues(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (lastLoadedDate.current === date) persist(next)
    }, 1500)
  }

  // Flush pending save when date changes
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const formatSavedAt = (iso: string | null) => {
    if (!iso) return null
    try {
      const d = new Date(iso)
      const diffMs = Date.now() - d.getTime()
      const mins = Math.floor(diffMs / 60000)
      if (mins < 1) return 'just now'
      if (mins < 60) return `${mins}m ago`
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch {
      return null
    }
  }

  const contextStrip = () => {
    if (!context || context.entry_count === 0) {
      return <span>No entries logged yet today.</span>
    }
    const hours = (context.total_minutes / 60).toFixed(1)
    const billable = context.billable_amount > 0 ? ` · $${context.billable_amount.toFixed(2)} billable` : ''
    const clientNames = context.clients.length > 0
      ? ` across ${context.clients.map(c => c.name).join(', ')}`
      : ''
    return <span>Today: {hours}h{clientNames}{billable} · {context.entry_count} {context.entry_count === 1 ? 'entry' : 'entries'}</span>
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Debrief</h3>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Clock className="w-3 h-3" />
          {saving ? 'Saving…' : savedAt ? `Saved ${formatSavedAt(savedAt)}` : 'Not saved'}
        </div>
      </div>

      <p className="text-xs text-slate-500">{contextStrip()}</p>

      <textarea
        value={values.summary}
        onChange={e => handleChange('summary', e.target.value)}
        rows={4}
        placeholder="What did you do today? Free-form recap…"
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none resize-none"
      />

      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Hide' : 'Add'} wins, blockers, follow-ups
      </button>

      {expanded && (
        <div className="space-y-3 pt-1">
          {(['wins', 'blockers', 'followups'] as const).map(field => (
            <div key={field}>
              <label className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                {FIELD_LABELS[field]}
              </label>
              <textarea
                value={values[field]}
                onChange={e => handleChange(field, e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
