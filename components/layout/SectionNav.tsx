'use client'

import { Sun, Briefcase, DollarSign, Menu } from 'lucide-react'
import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

export const SECTIONS = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'work', label: 'Work', icon: Briefcase },
  { id: 'money', label: 'Money', icon: DollarSign },
  { id: 'more', label: 'More', icon: Menu },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']

type SectionNavProps = {
  activeSection: SectionId
  onSectionChange: (id: SectionId) => void
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
  layout,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
  layout: 'horizontal' | 'vertical'
}) {
  if (layout === 'vertical') {
    return (
      <button
        onClick={onClick}
        className={clsx(
          'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
          active ? 'text-emerald-400' : 'text-slate-500'
        )}
      >
        <Icon className={clsx('h-5 w-5', active && 'drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]')} />
        {label}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors',
        active
          ? 'border-emerald-500 text-emerald-400'
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

export default function SectionNav({ activeSection, onSectionChange }: SectionNavProps) {
  return (
    <>
      {/* Desktop: top tab bar */}
      <div className="sticky top-0 z-10 hidden lg:block bg-[#0a0f1a]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-screen-xl mx-auto px-6">
          <nav className="flex gap-1">
            {SECTIONS.map(s => (
              <NavButton
                key={s.id}
                icon={s.icon}
                label={s.label}
                active={activeSection === s.id}
                onClick={() => onSectionChange(s.id)}
                layout="horizontal"
              />
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile: bottom nav bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex lg:hidden border-t border-slate-800 bg-[#0a0f1a]/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        {SECTIONS.map(s => (
          <NavButton
            key={s.id}
            icon={s.icon}
            label={s.label}
            active={activeSection === s.id}
            onClick={() => onSectionChange(s.id)}
            layout="vertical"
          />
        ))}
      </nav>
    </>
  )
}
