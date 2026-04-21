import type { NextRequest } from 'next/server'
import { format, subDays } from 'date-fns'
import { createAssistantContext } from '@/lib/assistant/context'
import { isAuthorizedAssistantServiceRequest } from '@/lib/assistant/service-auth'
import { getHoursSummary, getBillableSummary } from '@/lib/domain/time'
import { listOpenTasks } from '@/lib/domain/tasks'
import { getSchedule } from '@/lib/domain/calendar'
import { getDebrief } from '@/lib/domain/debriefs'
import { captureError } from '@/lib/logger'
import type { Task } from '@/types'

function localToday(tz: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz })
}

function formatDayName(tz: string): string {
  return new Date().toLocaleDateString('en-US', {
    timeZone: tz,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function isOverdue(task: Task, todayISO: string): boolean {
  return Boolean(task.due_date) && task.due_date! < todayISO
}

function daysOverdue(task: Task, todayISO: string): number {
  if (!task.due_date) return 0
  const due = new Date(task.due_date)
  const today = new Date(todayISO)
  return Math.max(0, Math.round((today.getTime() - due.getTime()) / 86_400_000))
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAssistantServiceRequest(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Service token error' },
      { status: 500 }
    )
  }

  const context = createAssistantContext({ surface: 'system' })
  const tz = context.timezone
  const todayISO = localToday(tz)
  const yesterdayISO = format(subDays(new Date(todayISO), 1), 'yyyy-MM-dd')

  try {
    const [openTasks, schedule, hours, billable, yesterdayDebrief, outstandingRes] = await Promise.all([
      listOpenTasks(context.supabase, 50),
      getSchedule(context.supabase, { start_date: todayISO, end_date: todayISO }),
      getHoursSummary(context.supabase, { period: 'week' }),
      getBillableSummary(context.supabase, { period: 'month' }),
      getDebrief(context.supabase, yesterdayISO).catch(() => null),
      Promise.all([
        context.supabase.from('invoices').select('total').is('deleted_at', null).in('status', ['sent', 'overdue']),
        context.supabase.from('square_invoices').select('amount_due').in('status', ['unpaid', 'overdue', 'partially_paid']),
      ]),
    ])

    const [manualInv, squareInv] = outstandingRes
    const manualOutstanding = (manualInv.data || []).reduce((s, r) => s + Number(r.total || 0), 0)
    const squareOutstanding = (squareInv.data || []).reduce((s, r) => s + Number(r.amount_due || 0), 0)
    const totalOutstanding = manualOutstanding + squareOutstanding

    const overdue = openTasks.filter((t: Task) => isOverdue(t, todayISO))
    const dueToday = openTasks.filter((t: Task) => t.due_date === todayISO)
    const highPriOther = openTasks.filter(
      (t: Task) => t.priority === 'high' && !isOverdue(t, todayISO) && t.due_date !== todayISO
    )

    const yesterdayHours = await getHoursSummary(context.supabase, {
      start_date: yesterdayISO,
      end_date: yesterdayISO,
    })
    const yHours = Math.round((yesterdayHours.minutes / 60) * 10) / 10
    const weekHours = Math.round((hours.minutes / 60) * 10) / 10

    const lines: string[] = []
    lines.push(`Good morning — ${formatDayName(tz)}.`)
    lines.push('')

    if (schedule.blocks.length) {
      const names = schedule.blocks
        .map(b => {
          const prop = (b as { property?: { name?: string } }).property?.name
          const notes = (b as { notes?: string }).notes
          return prop || notes || (b as { type?: string }).type || 'block'
        })
        .join(', ')
      lines.push(`Today's schedule: ${names}.`)
    } else {
      lines.push(`Today's schedule: nothing on the calendar.`)
    }

    if (dueToday.length) {
      lines.push(`Due today (${dueToday.length}): ${dueToday.map((t: Task) => t.title).join('; ')}.`)
    }
    if (overdue.length) {
      lines.push(
        `Overdue (${overdue.length}): ${overdue
          .map((t: Task) => `${t.title} (${daysOverdue(t, todayISO)}d overdue)`)
          .join('; ')}.`
      )
    }
    if (highPriOther.length) {
      lines.push(`High priority: ${highPriOther.map((t: Task) => t.title).join('; ')}.`)
    }
    if (!dueToday.length && !overdue.length && !highPriOther.length) {
      lines.push(`No urgent tasks.`)
    }

    lines.push('')
    const debriefNote = yesterdayDebrief ? '' : ' No debrief written yet.'
    lines.push(`Yesterday: ${yHours}h logged.${debriefNote}`)
    lines.push(`Week so far: ${weekHours}h. Billable MTD: $${billable.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`)
    if (totalOutstanding > 0) {
      const count = (manualInv.data?.length || 0) + (squareInv.data?.length || 0)
      lines.push(`Outstanding: $${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} across ${count} invoice${count === 1 ? '' : 's'}.`)
    }

    return Response.json({ message: lines.join('\n') })
  } catch (error) {
    captureError(error, { route: '/api/assistant/morning-brief', method: 'POST' })
    return Response.json(
      { error: error instanceof Error ? error.message : 'Morning brief failed' },
      { status: 500 }
    )
  }
}
