'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

const SLASH_COMMANDS = [
  { cmd: '/clockin', params: 'category, client, property, job, notes', desc: 'Start a timer now' },
  { cmd: '/clockout', params: 'notes', desc: 'Stop timer and write entry' },
  { cmd: '/log', params: 'minutes, category, client, property, job, notes', desc: 'Log time after the fact' },
  { cmd: '/task add', params: 'title, priority, client, property', desc: 'Create a task' },
  { cmd: '/task done', params: 'title', desc: 'Mark a task complete' },
  { cmd: '/block', params: 'property, start, end, notes', desc: 'Block calendar dates' },
  { cmd: '/status', params: '', desc: 'Clock-in status + today\'s summary' },
  { cmd: '/sync', params: '', desc: 'Trigger Square invoice sync' },
]

export default function DiscordSetupCard() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [showRef, setShowRef] = useState(false)

  async function handleRegister() {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/discord/register', {
        method: 'POST',
      })
      const payload = await response.json() as { error?: string; commands?: unknown[] }

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to register Discord commands')
      }

      const commandCount = Array.isArray(payload.commands) ? payload.commands.length : 0
      setCount(commandCount)
      setSuccess('Discord slash commands registered successfully.')
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
            Discord Setup
          </p>
          <h3 className="text-lg font-semibold text-white">Register slash commands</h3>
          <p className="max-w-2xl text-sm leading-6 text-slate-400">
            Push the current guild command set to Discord using the configured bot token,
            application ID, and guild ID. This only registers commands. It does not start the plain-text worker.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRegister}
          disabled={loading}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? 'Registering...' : 'Register Commands'}
        </button>
      </div>

      {success ? (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {success}{count !== null ? ` ${count} command${count === 1 ? '' : 's'} pushed.` : ''}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4 border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => setShowRef(v => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          {showRef ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          Slash Command Reference
        </button>
        {showRef && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                  <th className="pb-2 pr-4 font-medium">Command</th>
                  <th className="pb-2 pr-4 font-medium">Parameters</th>
                  <th className="pb-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {SLASH_COMMANDS.map(row => (
                  <tr key={row.cmd}>
                    <td className="py-2 pr-4 font-mono text-emerald-400 whitespace-nowrap">{row.cmd}</td>
                    <td className="py-2 pr-4 text-slate-400">{row.params || <span className="text-slate-600">none</span>}</td>
                    <td className="py-2 text-slate-300">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-600">
              Plain text also works — just type naturally in #nhs-os and the bot will parse your message with AI.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
