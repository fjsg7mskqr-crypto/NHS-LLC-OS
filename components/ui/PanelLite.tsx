import clsx from 'clsx'
import type { ReactNode } from 'react'

type PanelLiteProps = {
  title?: string
  status?: 'ok' | 'warn' | 'alert' | 'standby'
  right?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  noPadding?: boolean
}

const STATUS_DOT: Record<NonNullable<PanelLiteProps['status']>, string> = {
  ok: 'bg-emerald-400',
  warn: 'bg-[oklch(0.78_0.17_75)]',
  alert: 'bg-red-400',
  standby: 'bg-slate-600',
}

export default function PanelLite({
  title,
  status,
  right,
  children,
  className,
  bodyClassName,
  noPadding,
}: PanelLiteProps) {
  return (
    <div className={clsx('rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden', className)}>
      {(title || right || status) && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            {status && <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[status])} />}
            {title && (
              <h3 className="text-sm font-semibold text-slate-100 truncate">{title}</h3>
            )}
          </div>
          {right && <div className="flex items-center gap-2 text-xs text-slate-500">{right}</div>}
        </div>
      )}
      <div className={clsx(!noPadding && 'p-4', bodyClassName)}>{children}</div>
    </div>
  )
}
