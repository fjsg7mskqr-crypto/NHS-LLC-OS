'use client'

import { useState } from 'react'
import {
  Bot, Clock, ListChecks, Calendar, Settings, MessageSquare,
  Layers, ChevronDown, ChevronRight,
} from 'lucide-react'

type Section = {
  id: string
  title: string
  icon: typeof Bot
  body: React.ReactNode
}

function CodeRow({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-1.5 border-b border-slate-800/50 last:border-0">
      <code className="text-xs font-mono text-emerald-400 sm:w-64 sm:flex-shrink-0">{cmd}</code>
      <span className="text-xs text-slate-400">{desc}</span>
    </div>
  )
}

function ExampleRow({ input, action }: { input: string; action: string }) {
  return (
    <div className="py-1.5 border-b border-slate-800/50 last:border-0 space-y-0.5">
      <div className="text-xs text-slate-300">&ldquo;{input}&rdquo;</div>
      <div className="text-[11px] text-slate-500 pl-3">→ {action}</div>
    </div>
  )
}

const SECTIONS: Section[] = [
  {
    id: 'discord-slash',
    title: 'Discord — Slash Commands',
    icon: Bot,
    body: (
      <div className="space-y-1">
        <CodeRow cmd="/clockin [category] [client] [property] [job] [notes]" desc="Start a timer right now." />
        <CodeRow cmd="/clockout [notes]" desc="Stop the active timer and write the entry." />
        <CodeRow cmd="/log <minutes> [category] [client] [property] [job] [notes]" desc="Log time after the fact (anchored to now)." />
        <CodeRow cmd="/note <text>" desc="Append a note to the active timer (or last entry if not clocked in)." />
        <CodeRow cmd="/attach [client] [property] [job]" desc="Set client/property/job on active timer or last entry." />
        <CodeRow cmd="/debrief [summary] [wins] [blockers] [followups] [date] [replace]" desc="End-of-day reflection. Appends by default." />
        <CodeRow cmd="/status" desc="Current clock-in status and today's summary." />
        <CodeRow cmd="/task add <title> [priority] [client] [property]" desc="Create a task." />
        <CodeRow cmd="/task done <title>" desc="Mark a task complete (partial title match works)." />
        <CodeRow cmd="/block <property> <start> <end> [notes]" desc="Block calendar dates for a property (YYYY-MM-DD)." />
        <CodeRow cmd="/sync" desc="Trigger Square invoice sync now." />
      </div>
    ),
  },
  {
    id: 'discord-plain',
    title: 'Discord — Plain-Text (AI)',
    icon: MessageSquare,
    body: (
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          Just type naturally in the bot DM or channel — the assistant figures out which action to run. Examples:
        </p>
        <div className="space-y-1">
          <ExampleRow input="clock me in at SBR doing trim" action="clock_in (client: SBR, category: client_work)" />
          <ExampleRow input="log 9:30-10:45 today painting at the Lodge" action="log_time (start/end times, property: Lodge)" />
          <ExampleRow input="log 75 minutes admin" action="log_time (75 min, anchored to now)" />
          <ExampleRow input="that last entry was actually at SBR" action="annotate_entry (sets client on most recent entry)" />
          <ExampleRow input="I'm at Sleeping Bear now" action="annotate_session (sets client on active timer)" />
          <ExampleRow input="today I finished the Den deck, behind on Miller" action="write_debrief (append: true)" />
          <ExampleRow input="add task: order more stain, high priority" action="create_task" />
          <ExampleRow input="how many hours this week?" action="get_hours_summary" />
          <ExampleRow input="block SBR May 1-3 guest stay" action="create_calendar_block" />
        </div>
        <p className="text-xs text-slate-500 pt-2">
          <span className="text-emerald-400">Tip:</span> if attribution looks wrong after a clock-out,
          just say &ldquo;that was at [client]&rdquo; — it&rsquo;ll patch the most recent entry.
        </p>
      </div>
    ),
  },
  {
    id: 'capture-flow',
    title: 'Capture Flow (Field → Office)',
    icon: Clock,
    body: (
      <div className="space-y-2 text-xs text-slate-400">
        <p><span className="text-emerald-400 font-semibold">In the field:</span> use Discord. Fastest is <code className="text-emerald-400">/clockin</code> with no args, then <code className="text-emerald-400">/note</code> + <code className="text-emerald-400">/attach</code> as you remember details, then <code className="text-emerald-400">/clockout</code> when done.</p>
        <p><span className="text-emerald-400 font-semibold">After the fact:</span> <code className="text-emerald-400">/log 90 minutes</code> for quick captures, or type &ldquo;log 9:30-10:45 today at SBR&rdquo; for explicit times.</p>
        <p><span className="text-emerald-400 font-semibold">End of day:</span> <code className="text-emerald-400">/debrief</code> or just message the bot &ldquo;today I did X, blocked on Y, follow up on Z&rdquo; — it builds your day-level reflection.</p>
        <p><span className="text-emerald-400 font-semibold">Cleanup at the desk:</span> Time tab → day view → fix any entries the bot got wrong, fill in the Debrief panel.</p>
      </div>
    ),
  },
  {
    id: 'hierarchy',
    title: 'Data Hierarchy',
    icon: Layers,
    body: (
      <div className="space-y-2 text-xs text-slate-400">
        <p>Three levels, top-down:</p>
        <div className="pl-3 space-y-1 font-mono text-[11px]">
          <div><span className="text-emerald-400">Client</span> — who pays you (e.g. Sleeping Bear Resort)</div>
          <div className="pl-4"><span className="text-emerald-400">└─ Property</span> — a specific location (e.g. Den Cabin)</div>
          <div className="pl-8"><span className="text-emerald-400">└─ Job</span> — a project/scope at that property (e.g. &ldquo;Repaint deck&rdquo;)</div>
          <div className="pl-12"><span className="text-emerald-400">└─ Time Entry</span> — a chunk of work on that job</div>
        </div>
        <p className="pt-2">All four are optional on a time entry — but billable hours need at least a client to compute the rate.</p>
        <p><span className="text-emerald-400">Categories:</span> client_work, drive_time, prep, admin, equipment_maint.</p>
      </div>
    ),
  },
  {
    id: 'dashboard-tabs',
    title: 'Dashboard Layout',
    icon: ListChecks,
    body: (
      <div className="space-y-2 text-xs text-slate-400">
        <p><span className="text-emerald-400 font-semibold">TODAY</span> — at-a-glance overview of today&rsquo;s activity.</p>
        <p><span className="text-emerald-400 font-semibold">WORK</span> — Time, Jobs, Clients, Properties. Most of the day-to-day lives here.</p>
        <p className="pl-4">Time tab: day/week/month/range views, the Debrief panel (day view only), profitability tables, and PDF/CSV exports.</p>
        <p><span className="text-emerald-400 font-semibold">MONEY</span> — Revenue, invoices, expenses, Square sync.</p>
        <p><span className="text-emerald-400 font-semibold">MORE</span> — Calendar blocks, equipment, tasks, this Help tab.</p>
      </div>
    ),
  },
  {
    id: 'debrief',
    title: 'Debrief vs Notes',
    icon: Calendar,
    body: (
      <div className="space-y-2 text-xs text-slate-400">
        <p><span className="text-emerald-400 font-semibold">Per-entry notes</span> — what you did during that specific time block. Lives on the time entry. Edit in the Time tab or set via <code className="text-emerald-400">/note</code>.</p>
        <p><span className="text-emerald-400 font-semibold">Day-level debrief</span> — free-form recap of the whole day, plus optional wins / blockers / follow-ups. Lives in its own table, one per date. Auto-saves in the Time tab (day view) or use <code className="text-emerald-400">/debrief</code>.</p>
        <p>Saying &ldquo;today I did X&rdquo; to the bot writes a debrief, NOT a time entry. To log time, you need a duration or a clock range.</p>
      </div>
    ),
  },
  {
    id: 'misc',
    title: 'Misc',
    icon: Settings,
    body: (
      <div className="space-y-2 text-xs text-slate-400">
        <p><span className="text-emerald-400">Timezone:</span> America/Detroit. The bot interprets &ldquo;today&rdquo;, &ldquo;9:30&rdquo;, etc. in that zone.</p>
        <p><span className="text-emerald-400">Square sync:</span> daily cron (Hobby plan limit). Run <code className="text-emerald-400">/sync</code> for an on-demand pull.</p>
        <p><span className="text-emerald-400">Assistant model:</span> <code className="text-emerald-400">gpt-5.4-mini</code> by default. Override via <code className="text-emerald-400">OPENAI_ASSISTANT_MODEL</code> env var.</p>
        <p><span className="text-emerald-400">Discord setup:</span> see the Discord card at the top of this section to (re-)register slash commands after deploying changes.</p>
      </div>
    ),
  },
]

export default function HelpTab() {
  const [open, setOpen] = useState<Set<string>>(new Set(['discord-slash', 'discord-plain']))

  const toggle = (id: string) => {
    setOpen(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold text-white mb-1">How to use NHS-LLC-OS</h2>
        <p className="text-xs text-slate-500">
          Quick reference for capture in the field, day-level reflection, and the dashboard layout.
        </p>
      </div>

      {SECTIONS.map(section => {
        const Icon = section.icon
        const isOpen = open.has(section.id)
        return (
          <div key={section.id} className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(section.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/40 transition-colors"
            >
              <Icon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="flex-1 text-sm font-medium text-white">{section.title}</span>
              {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            </button>
            {isOpen && <div className="px-4 pb-4 pt-1 border-t border-slate-800">{section.body}</div>}
          </div>
        )
      })}
    </div>
  )
}
