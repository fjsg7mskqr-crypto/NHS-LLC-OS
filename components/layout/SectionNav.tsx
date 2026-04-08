'use client'

import { Sun, Briefcase, DollarSign, Menu, Command as CommandIcon } from 'lucide-react'
import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

export const SECTIONS = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'work',  label: 'Work',  icon: Briefcase },
  { id: 'money', label: 'Money', icon: DollarSign },
  { id: 'more',  label: 'More',  icon: Menu },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']

type SectionNavProps = {
  activeSection: SectionId
  onSectionChange: (id: SectionId) => void
}

function RailButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'group relative flex items-center w-full h-14 pl-4 pr-3 border-l-2 transition-all font-mono text-left',
        active
          ? 'border-[oklch(0.78_0.17_75)] bg-[oklch(0.78_0.17_75/0.08)] text-[oklch(0.78_0.17_75)]'
          : 'border-transparent text-slate-500 hover:text-slate-200 hover:bg-slate-800/40 hover:border-slate-700'
      )}
    >
      {/* active corner brackets */}
      {active && (
        <>
          <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[oklch(0.78_0.17_75)]" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[oklch(0.78_0.17_75)]" />
        </>
      )}
      <Icon className={clsx('w-4 h-4 mr-3 flex-shrink-0', active && 'drop-shadow-[0_0_6px_oklch(0.78_0.17_75)]')} />
      <span className="text-[11px] tracking-[0.2em] uppercase font-bold">{label}</span>
      {active && <span className="ml-auto w-1 h-1 bg-[oklch(0.78_0.17_75)] tactical-pulse" />}
    </button>
  )
}

export default function SectionNav({ activeSection, onSectionChange }: SectionNavProps) {
  const triggerPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
  }

  return (
    <>
      {/* Desktop: vertical command rail */}
      <aside className="hidden lg:flex sticky top-14 z-10 flex-col w-56 shrink-0 self-start h-[calc(100vh-3.5rem-1.75rem)] border-r border-slate-700/60 bg-[oklch(0.13_0.02_240/0.85)] backdrop-blur-sm">
        <div className="px-4 py-3 border-b border-slate-700/60">
          <div className="text-[10px] tracking-[0.2em] text-slate-400">NAVIGATION</div>
        </div>
        <nav className="flex flex-col">
          {SECTIONS.map(s => (
            <RailButton
              key={s.id}
              icon={s.icon}
              label={s.label}
              active={activeSection === s.id}
              onClick={() => onSectionChange(s.id)}
            />
          ))}
        </nav>

        <div className="mt-auto p-3 border-t border-slate-700/60 space-y-3">
          <button
            onClick={triggerPalette}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-700/60 hover:border-[oklch(0.78_0.17_75)] hover:bg-[oklch(0.78_0.17_75/0.08)] text-slate-400 hover:text-[oklch(0.78_0.17_75)] transition-colors group"
          >
            <span className="flex items-center gap-2 text-[10px] tracking-[0.2em] font-mono">
              <CommandIcon className="w-3 h-3" />
              SEARCH
            </span>
            <span className="text-[9px] font-mono text-slate-600 group-hover:text-[oklch(0.78_0.17_75)]">⌘K</span>
          </button>
          <div className="text-[9px] tracking-[0.15em] text-slate-700 font-mono leading-relaxed">
            <div className="flex justify-between"><span>SUPABASE</span><span className="text-[oklch(0.75_0.18_145)]">●</span></div>
            <div className="flex justify-between"><span>SQUARE</span><span className="text-[oklch(0.75_0.18_145)]">●</span></div>
            <div className="flex justify-between"><span>DISCORD</span><span className="text-[oklch(0.78_0.17_75)]">●</span></div>
          </div>
        </div>
      </aside>

      {/* Mobile: bottom command bar */}
      <nav className="fixed bottom-7 inset-x-0 z-30 flex lg:hidden border-t border-slate-700/60 bg-[oklch(0.12_0.02_240/0.97)] backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        {SECTIONS.map(s => {
          const Icon = s.icon
          const active = activeSection === s.id
          return (
            <button
              key={s.id}
              onClick={() => onSectionChange(s.id)}
              className={clsx(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] tracking-[0.15em] font-mono uppercase relative',
                active ? 'text-[oklch(0.78_0.17_75)]' : 'text-slate-600'
              )}
            >
              {active && <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-[oklch(0.78_0.17_75)]" />}
              <Icon className={clsx('h-4 w-4', active && 'drop-shadow-[0_0_6px_oklch(0.78_0.17_75)]')} />
              {s.label}
            </button>
          )
        })}
      </nav>
    </>
  )
}
