import { format } from 'date-fns'
import type {
  AssistantActionDefinition,
  AssistantActionName,
  AssistantActionResult,
  BillableSummaryArgs,
  ClockInArgs,
  ClockOutArgs,
  CompleteTaskArgs,
  CreateCalendarBlockArgs,
  CreateTaskArgs,
  GetOpenTasksArgs,
  GetScheduleArgs,
  HoursSummaryArgs,
  LogTimeArgs,
  TriggerSquareSyncArgs,
  ValidationResult,
} from './types'
import { formatCurrency, formatDateTime, formatHours, joinList } from './format'
import {
  createClockSession,
  createTimeEntry,
  getBillableSummary,
  getHoursSummary,
  clockOutActiveSession,
  VALID_CATEGORIES,
  buildTimeRangeFromMinutes,
} from '@/lib/domain/time'
import { completeTask, createTask, listOpenTasks, VALID_PRIORITIES } from '@/lib/domain/tasks'
import { createCalendarBlock, getSchedule, VALID_BLOCK_TYPES } from '@/lib/domain/calendar'
import { getStatusSnapshot } from '@/lib/domain/reports'
import { syncSquareInvoices } from '@/lib/domain/square'

type ValidatedLogTimeArgs = LogTimeArgs & {
  start_time: string
  end_time: string
}

type RuntimeAssistantAction = {
  name: AssistantActionName
  description: string
  readOnly: boolean
  validate: (input: unknown) => ValidationResult<Record<string, unknown>>
  execute: (
    context: import('./context').AssistantContext,
    args: Record<string, unknown>
  ) => Promise<unknown>
  format: (
    result: unknown,
    args: Record<string, unknown>,
    context: import('./context').AssistantContext
  ) => string
}

function ok<T>(data: T): ValidationResult<T> {
  return { success: true, data }
}

function fail<T>(error: string): ValidationResult<T> {
  return { success: false, error }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  return typeof value === 'string' ? value : null
}

function optionalBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

function optionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function validateDate(value: unknown, field: string): ValidationResult<string> {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fail(`${field} must be a YYYY-MM-DD string`)
  }
  return ok(value)
}

const clockInAction: AssistantActionDefinition<ClockInArgs, Awaited<ReturnType<typeof createClockSession>>> = {
  name: 'clock_in',
  description: 'Start an active clock session.',
  readOnly: false,
  validate(input) {
    if (!isRecord(input)) return fail('clock_in args must be an object')
    const categoryRaw = input.category
    if (
      categoryRaw !== undefined &&
      (typeof categoryRaw !== 'string' || !VALID_CATEGORIES.includes(categoryRaw as never))
    ) {
      return fail(`category must be one of: ${VALID_CATEGORIES.join(', ')}`)
    }

    return ok({
      category: (categoryRaw as ClockInArgs['category']) || 'client_work',
      client_id: optionalString(input.client_id),
      job_id: optionalString(input.job_id),
      property_id: optionalString(input.property_id),
      notes: optionalString(input.notes),
      billable: optionalBoolean(input.billable),
      hourly_rate: optionalNumber(input.hourly_rate),
    })
  },
  async execute(context, args) {
    return createClockSession(context.supabase, args)
  },
  format(result) {
    return `Clocked in at ${formatDateTime(result.started_at)}.`
  },
}

const clockOutAction: AssistantActionDefinition<
  ClockOutArgs,
  Awaited<ReturnType<typeof clockOutActiveSession>>
> = {
  name: 'clock_out',
  description: 'Stop the active clock session and save a time entry.',
  readOnly: false,
  validate(input) {
    if (!isRecord(input)) return fail('clock_out args must be an object')
    return ok({
      end_time: optionalString(input.end_time) || undefined,
      notes: optionalString(input.notes),
    })
  },
  async execute(context, args) {
    return clockOutActiveSession(context.supabase, args)
  },
  format(result) {
    return `Clocked out. Logged ${formatHours(result.entry.duration_minutes || 0)} from ${formatDateTime(result.entry.start_time)} to ${formatDateTime(result.entry.end_time)}.`
  },
}

const logTimeAction: AssistantActionDefinition<ValidatedLogTimeArgs, Awaited<ReturnType<typeof createTimeEntry>>> = {
  name: 'log_time',
  description: 'Create a time entry.',
  readOnly: false,
  validate(input) {
    if (!isRecord(input)) return fail('log_time args must be an object')
    const category = input.category
    if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category as never)) {
      return fail(`category must be one of: ${VALID_CATEGORIES.join(', ')}`)
    }

    const minutes = input.minutes
    const start = input.start_time
    const end = input.end_time

    if (minutes !== undefined) {
      if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
        return fail('minutes must be a positive number')
      }
    } else if (typeof start !== 'string' || typeof end !== 'string') {
      return fail('Provide either minutes or both start_time and end_time')
    }

    const range =
      typeof minutes === 'number'
        ? buildTimeRangeFromMinutes(minutes)
        : { start_time: String(start), end_time: String(end) }

    return ok({
      start_time: range.start_time,
      end_time: range.end_time,
      minutes: typeof minutes === 'number' ? minutes : undefined,
      category: category as ValidatedLogTimeArgs['category'],
      client_id: optionalString(input.client_id),
      job_id: optionalString(input.job_id),
      property_id: optionalString(input.property_id),
      notes: optionalString(input.notes),
      billable: optionalBoolean(input.billable),
      hourly_rate: optionalNumber(input.hourly_rate),
      source: optionalString(input.source) || 'assistant',
    })
  },
  async execute(context, args) {
    return createTimeEntry(context.supabase, args)
  },
  format(result) {
    return `Logged ${formatHours(result.duration_minutes || 0)} of ${String(result.category).replaceAll('_', ' ')} time.`
  },
}

const createTaskAction: AssistantActionDefinition<CreateTaskArgs, Awaited<ReturnType<typeof createTask>>> = {
  name: 'create_task',
  description: 'Create an operational task.',
  readOnly: false,
  validate(input) {
    if (!isRecord(input)) return fail('create_task args must be an object')
    if (typeof input.title !== 'string' || !input.title.trim()) {
      return fail('title is required')
    }
    const priority = input.priority
    if (
      priority !== undefined &&
      (typeof priority !== 'string' || !VALID_PRIORITIES.includes(priority as never))
    ) {
      return fail(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`)
    }

    return ok({
      title: input.title.trim(),
      priority: (priority as CreateTaskArgs['priority']) || 'medium',
      due_date: optionalString(input.due_date),
      client_id: optionalString(input.client_id),
      property_id: optionalString(input.property_id),
      job_id: optionalString(input.job_id),
    })
  },
  async execute(context, args) {
    return createTask(context.supabase, args)
  },
  format(result) {
    return `Created ${result.priority} priority task: ${result.title}.`
  },
}

const completeTaskAction: AssistantActionDefinition<CompleteTaskArgs, Awaited<ReturnType<typeof completeTask>>> =
  {
    name: 'complete_task',
    description: 'Mark a task complete.',
    readOnly: false,
    validate(input) {
      if (!isRecord(input)) return fail('complete_task args must be an object')
      const taskId = optionalString(input.task_id)
      const title = optionalString(input.title)
      if (!taskId && !title) {
        return fail('task_id or title is required')
      }
      return ok({ task_id: taskId || undefined, title: title || undefined })
    },
    async execute(context, args) {
      return completeTask(context.supabase, args)
    },
    format(result) {
      return `Completed task: ${result.title}.`
    },
  }

const createCalendarBlockAction: AssistantActionDefinition<
  CreateCalendarBlockArgs,
  Awaited<ReturnType<typeof createCalendarBlock>>
> = {
  name: 'create_calendar_block',
  description: 'Create a calendar block.',
  readOnly: false,
  validate(input) {
    if (!isRecord(input)) return fail('create_calendar_block args must be an object')
    const start = validateDate(input.start_date, 'start_date')
    if (!start.success) return start
    const end = validateDate(input.end_date, 'end_date')
    if (!end.success) return end

    const type = input.type
    if (
      type !== undefined &&
      (typeof type !== 'string' || !VALID_BLOCK_TYPES.includes(type as never))
    ) {
      return fail(`type must be one of: ${VALID_BLOCK_TYPES.join(', ')}`)
    }

    return ok({
      property_id: optionalString(input.property_id),
      type: (type as CreateCalendarBlockArgs['type']) || 'job_day',
      start_date: start.data,
      end_date: end.data,
      notes: optionalString(input.notes),
      source: optionalString(input.source) || 'assistant',
    })
  },
  async execute(context, args) {
    return createCalendarBlock(context.supabase, args)
  },
  format(result) {
    return `Created ${result.type.replace('_', ' ')} block for ${result.start_date}${result.end_date !== result.start_date ? ` through ${result.end_date}` : ''}.`
  },
}

const getStatusAction: AssistantActionDefinition<Record<string, never>, Awaited<ReturnType<typeof getStatusSnapshot>>> =
  {
    name: 'get_status',
    description: 'Summarize current operational status.',
    readOnly: true,
    validate(input) {
      if (input !== undefined && (!isRecord(input) || Object.keys(input).length > 0)) {
        return fail('get_status does not take arguments')
      }
      return ok({})
    },
    async execute(context) {
      return getStatusSnapshot(context.supabase)
    },
    format(result) {
      const parts = [
        result.activeSession
          ? `Clocked in since ${formatDateTime(result.activeSession.started_at)}`
          : 'Not currently clocked in',
        `${result.openTasks.length} open tasks in the top queue`,
        `${result.todayBlocks.length} calendar blocks today`,
        `${formatCurrency(result.billableMonthToDate.amount)} billed MTD`,
        `${formatHours(result.hoursThisWeek.minutes)} logged this week`,
      ]

      return parts.join('. ') + '.'
    },
  }

const getHoursSummaryAction: AssistantActionDefinition<
  HoursSummaryArgs,
  Awaited<ReturnType<typeof getHoursSummary>>
> = {
  name: 'get_hours_summary',
  description: 'Summarize hours for a period.',
  readOnly: true,
  validate(input) {
    if (!isRecord(input)) return ok({ period: 'week' })
    const period = input.period
    if (period !== undefined && period !== 'week' && period !== 'month') {
      return fail('period must be week or month')
    }
    return ok({
      start_date: optionalString(input.start_date) || undefined,
      end_date: optionalString(input.end_date) || undefined,
      period: (period as HoursSummaryArgs['period']) || 'week',
    })
  },
  async execute(context, args) {
    return getHoursSummary(context.supabase, args)
  },
  format(result) {
    return `Logged ${formatHours(result.minutes)} from ${result.start_date} through ${result.end_date}.`
  },
}

const getBillableSummaryAction: AssistantActionDefinition<
  BillableSummaryArgs,
  Awaited<ReturnType<typeof getBillableSummary>>
> = {
  name: 'get_billable_summary',
  description: 'Summarize billable work for a period.',
  readOnly: true,
  validate(input) {
    if (!isRecord(input)) return ok({ period: 'month' })
    const period = input.period
    if (period !== undefined && period !== 'week' && period !== 'month') {
      return fail('period must be week or month')
    }
    return ok({
      start_date: optionalString(input.start_date) || undefined,
      end_date: optionalString(input.end_date) || undefined,
      period: (period as BillableSummaryArgs['period']) || 'month',
    })
  },
  async execute(context, args) {
    return getBillableSummary(context.supabase, args)
  },
  format(result) {
    return `${formatCurrency(result.amount)} billable across ${formatHours(result.minutes)} from ${result.start_date} through ${result.end_date}.`
  },
}

const getOpenTasksAction: AssistantActionDefinition<GetOpenTasksArgs, Awaited<ReturnType<typeof listOpenTasks>>> = {
  name: 'get_open_tasks',
  description: 'List open tasks.',
  readOnly: true,
  validate(input) {
    if (!isRecord(input)) return ok({ limit: 10 })
    const limit = input.limit
    if (limit !== undefined && (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0)) {
      return fail('limit must be a positive number')
    }
    return ok({ limit: typeof limit === 'number' ? Math.min(limit, 25) : 10 })
  },
  async execute(context, args) {
    return listOpenTasks(context.supabase, args.limit)
  },
  format(result) {
    if (result.length === 0) return 'No open tasks.'
    return `Open tasks: ${joinList(result.slice(0, 5).map(task => task.title))}.`
  },
}

const getScheduleAction: AssistantActionDefinition<GetScheduleArgs, Awaited<ReturnType<typeof getSchedule>>> = {
  name: 'get_schedule',
  description: 'Get schedule blocks for a date range.',
  readOnly: true,
  validate(input) {
    if (!isRecord(input)) {
      const today = format(new Date(), 'yyyy-MM-dd')
      return ok({ start_date: today, end_date: today })
    }
    return ok({
      start_date: optionalString(input.start_date) || format(new Date(), 'yyyy-MM-dd'),
      end_date:
        optionalString(input.end_date) ||
        optionalString(input.start_date) ||
        format(new Date(), 'yyyy-MM-dd'),
    })
  },
  async execute(context, args) {
    return getSchedule(context.supabase, args)
  },
  format(result) {
    if (result.blocks.length === 0) {
      return `No blocks scheduled from ${result.start_date} through ${result.end_date}.`
    }
    return `Scheduled ${result.blocks.length} block${result.blocks.length === 1 ? '' : 's'} from ${result.start_date} through ${result.end_date}.`
  },
}

const triggerSquareSyncAction: AssistantActionDefinition<
  TriggerSquareSyncArgs,
  Awaited<ReturnType<typeof syncSquareInvoices>>
> = {
  name: 'trigger_square_sync',
  description: 'Run the Square invoice sync.',
  readOnly: false,
  validate(input) {
    if (!isRecord(input)) return ok({})
    return ok({ force: optionalBoolean(input.force) })
  },
  async execute(context) {
    return syncSquareInvoices(context.supabase)
  },
  format(result) {
    return result.message
  },
}

export const assistantActions = {
  clock_in: clockInAction,
  clock_out: clockOutAction,
  log_time: logTimeAction,
  create_task: createTaskAction,
  complete_task: completeTaskAction,
  create_calendar_block: createCalendarBlockAction,
  get_status: getStatusAction,
  get_hours_summary: getHoursSummaryAction,
  get_billable_summary: getBillableSummaryAction,
  get_open_tasks: getOpenTasksAction,
  get_schedule: getScheduleAction,
  trigger_square_sync: triggerSquareSyncAction,
}

export async function runAssistantAction<TName extends AssistantActionName>(
  context: import('./context').AssistantContext,
  name: TName,
  rawArgs: unknown
): Promise<AssistantActionResult<unknown>> {
  const action = assistantActions[name] as unknown as RuntimeAssistantAction
  const validated = action.validate(rawArgs)
  if (!validated.success) {
    throw new Error(validated.error)
  }

  const result = await action.execute(context, validated.data)
  const reply = action.format(result, validated.data, context)

  return {
    ok: true,
    name,
    args: validated.data as Record<string, unknown>,
    result,
    reply,
    readOnly: action.readOnly,
  }
}
