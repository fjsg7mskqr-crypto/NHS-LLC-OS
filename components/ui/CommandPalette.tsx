'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Briefcase, DollarSign, Sun, Menu, Clock, Users, FileText, Calendar } from 'lucide-react'

const ITEMS = [
  { group: 'NAVIGATE', items: [
    { id: 'today', label: 'Today', icon: Sun, action: '/dashboard?section=today' },
    { id: 'work', label: 'Work', icon: Briefcase, action: '/dashboard?section=work' },
    { id: 'money', label: 'Money', icon: DollarSign, action: '/dashboard?section=money' },
    { id: 'more', label: 'More', icon: Menu, action: '/dashboard?section=more' },
  ]},
  { group: 'JUMP TO', items: [
    { id: 'jobs', label: 'Jobs', icon: Briefcase, action: '/dashboard?section=work' },
    { id: 'time', label: 'Time Entries', icon: Clock, action: '/dashboard?section=work' },
    { id: 'clients', label: 'Clients', icon: Users, action: '/dashboard?section=work' },
    { id: 'invoices', label: 'Invoices', icon: FileText, action: '/dashboard?section=money' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, action: '/dashboard?section=more' },
  ]},
] as const

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-xl mx-4 bg-[oklch(0.18_0.02_240)] border border-[oklch(0.78_0.17_75)] shadow-[0_0_60px_oklch(0.78_0.17_75/0.25)]"
        onClick={e => e.stopPropagation()}
      >
        <span className="pointer-events-none absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2 border-[oklch(0.78_0.17_75)]" />
        <span className="pointer-events-none absolute -top-px -right-px w-4 h-4 border-t-2 border-r-2 border-[oklch(0.78_0.17_75)]" />
        <span className="pointer-events-none absolute -bottom-px -left-px w-4 h-4 border-b-2 border-l-2 border-[oklch(0.78_0.17_75)]" />
        <span className="pointer-events-none absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2 border-[oklch(0.78_0.17_75)]" />

        <Command className="font-mono">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/60">
            <span className="text-[10px] tracking-[0.2em] text-[oklch(0.78_0.17_75)]">⌘K</span>
            <span className="text-slate-600">▸</span>
            <Command.Input
              placeholder="Search..."
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 outline-none tracking-wider"
              autoFocus
            />
            <span className="text-[10px] text-slate-600">ESC</span>
          </div>
          <Command.List className="max-h-[50vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-xs tracking-[0.2em] text-slate-600">
              NO RESULTS
            </Command.Empty>
            {ITEMS.map(group => (
              <Command.Group
                key={group.group}
                heading={group.group}
                className="text-[10px] tracking-[0.2em] text-slate-600 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2"
              >
                {group.items.map(item => {
                  const Icon = item.icon
                  return (
                    <Command.Item
                      key={item.id}
                      value={item.label}
                      onSelect={() => {
                        router.push(item.action)
                        setOpen(false)
                      }}
                      className="flex items-center gap-3 px-3 py-2 text-xs text-slate-300 cursor-pointer aria-selected:bg-[oklch(0.78_0.17_75/0.15)] aria-selected:text-[oklch(0.78_0.17_75)]"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="tracking-wider flex-1">{item.label}</span>
                    </Command.Item>
                  )
                })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
