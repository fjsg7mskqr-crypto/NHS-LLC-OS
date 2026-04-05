'use client'

import clsx from 'clsx'

type Tab<T extends string> = {
  id: T
  label: string
}

type SubTabsProps<T extends string> = {
  tabs: readonly Tab<T>[]
  active: T
  onChange: (id: T) => void
}

export default function SubTabs<T extends string>({ tabs, active, onChange }: SubTabsProps<T>) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-900/60 p-1">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
            active === tab.id
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
