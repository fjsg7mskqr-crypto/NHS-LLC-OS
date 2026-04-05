'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Bot, LoaderCircle, Send, Sparkles, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import AssistantMessage from './AssistantMessage'
import type { AssistantResponse } from '@/lib/assistant/types'

type TranscriptItem = {
  id: string
  role: 'user' | 'assistant'
  content: string
  actionName?: string
}

const STORAGE_KEY = 'nhs-assistant-transcript'

export default function AssistantPanel() {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [items, setItems] = useState<TranscriptItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        setItems(JSON.parse(raw) as TranscriptItem[])
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [items, isPending, open])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return

    const userItem: TranscriptItem = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: trimmed,
    }

    const nextItems = [...items, userItem]
    setItems(nextItems)
    setMessage('')
    setError(null)

    startTransition(async () => {
      try {
        const response = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            history: nextItems.map(item => ({
              role: item.role,
              content: item.content,
            })),
          }),
        })

        const payload = await response.json() as AssistantResponse & { error?: string }
        if (!response.ok) {
          throw new Error(payload.error || 'Assistant request failed')
        }

        const assistantItem: TranscriptItem = {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: payload.reply,
          actionName: payload.action?.name,
        }

        setItems(current => [...current, assistantItem])

        if (payload.action && !payload.needsClarification) {
          if (payload.action.name === 'clock_in') {
            window.dispatchEvent(new CustomEvent('nhs_clock_event', {
              detail: {
                action: 'clock_in',
                startTime: (payload.action.result as { started_at?: string })?.started_at,
              },
            }))
          }

          if (payload.action.name === 'clock_out') {
            window.dispatchEvent(new CustomEvent('nhs_clock_event', {
              detail: { action: 'clock_out' },
            }))
          }

          const writeActions = new Set([
            'clock_in',
            'clock_out',
            'log_time',
            'create_task',
            'complete_task',
            'create_calendar_block',
            'trigger_square_sync',
          ])

          if (writeActions.has(payload.action.name)) {
            router.refresh()
          }
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Assistant request failed')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-emerald-400/30 bg-[#08131a]/95 px-4 py-3 text-sm font-medium text-emerald-100 shadow-[0_14px_45px_rgba(16,185,129,0.22)] backdrop-blur"
      >
        <Sparkles className="h-4 w-4 text-emerald-300" />
        Assistant
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]">
          <div className="absolute inset-y-0 right-0 flex w-full justify-end">
            <div className="flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-[#071018] shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-2 text-emerald-300">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Operations Assistant</h2>
                    <p className="text-xs text-slate-400">Shared action layer for the dashboard.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:border-slate-600 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-5">
                    <p className="text-sm text-slate-200">Ask operational questions or execute a write action.</p>
                    <p className="mt-2 text-xs leading-6 text-slate-400">
                      Try “what did I bill this month?”, “add a high priority task to order stain”, or “log 45 minutes of admin time”.
                    </p>
                  </div>
                ) : null}

                {items.map(item => (
                  <AssistantMessage
                    key={item.id}
                    role={item.role}
                    content={item.content}
                    actionName={item.actionName}
                  />
                ))}

                {isPending ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Working
                  </div>
                ) : null}
              </div>

              <div className="border-t border-slate-800 px-4 py-4">
                {error ? (
                  <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={3}
                    placeholder="Type an operational request..."
                    className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Writes are validated server-side
                    </p>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
