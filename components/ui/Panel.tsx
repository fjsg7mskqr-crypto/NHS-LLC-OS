import clsx from 'clsx'
import type { ReactNode } from 'react'

type PanelProps = {
  title?: string
  code?: string
  status?: 'ok' | 'warn' | 'alert' | 'standby'
  right?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  noPadding?: boolean
}

const STATUS_DOT: Record<NonNullable<PanelProps['status']>, string> = {
  ok: 'bg-[oklch(0.75_0.18_145)] shadow-[0_0_8px_oklch(0.75_0.18_145)]',
  warn: 'bg-[oklch(0.78_0.17_75)] shadow-[0_0_8px_oklch(0.78_0.17_75)]',
  alert: 'bg-[oklch(0.65_0.22_25)] shadow-[0_0_8px_oklch(0.65_0.22_25)]',
  standby: 'bg-slate-600',
}


export default function Panel({
  title,
  code,
  status,
  right,
  children,
  className,
  bodyClassName,
  noPadding,
}: PanelProps) {
  return (
    <div
      className={clsx(
        'relative bg-[oklch(0.18_0.02_240/0.6)] border border-slate-700/60 backdrop-blur-sm',
        'before:content-[""] before:absolute before:top-0 before:left-0 before:w-3 before:h-3 before:border-t before:border-l before:border-[oklch(0.78_0.17_75)]',
        'after:content-[""] after:absolute after:top-0 after:right-0 after:w-3 after:h-3 after:border-t after:border-r after:border-[oklch(0.78_0.17_75)]',
        className
      )}
    >
      {/* bottom corners */}
      <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[oklch(0.78_0.17_75)]" />
      <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[oklch(0.78_0.17_75)]" />

      {(title || right || code || status) && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-slate-700/60 bg-slate-900/40">
          <div className="flex items-center gap-2 min-w-0">
            {status && (
              <span className={clsx('w-1.5 h-1.5', STATUS_DOT[status], status !== 'standby' && 'tactical-pulse')} />
            )}
            {code && <span className="text-[10px] tracking-[0.2em] text-[oklch(0.78_0.17_75)] font-mono">{code}</span>}
            {title && (
              <h3 className="text-[11px] tracking-[0.2em] text-slate-200 font-mono uppercase truncate">
                {title}
              </h3>
            )}
          </div>
          {right && <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">{right}</div>}
        </div>
      )}

      <div className={clsx(!noPadding && 'p-4', bodyClassName)}>{children}</div>
    </div>
  )
}
