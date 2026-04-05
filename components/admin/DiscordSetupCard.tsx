'use client'

import { useState } from 'react'

export default function DiscordSetupCard() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [count, setCount] = useState<number | null>(null)

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
    </section>
  )
}
