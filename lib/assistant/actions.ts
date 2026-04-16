import { format } from 'date-fns'
import type {
  AnnotateEntryArgs,
  AnnotateSessionArgs,
  AssistantActionDefinition,
  AssistantActionName,
  AssistantActionResult,
  BillableSummaryArgs,
  ClockInArgs,
  ClockOutArgs,
  CompleteTaskArgs,
  CreateCalendarBlockArgs,
  CreateTaskArgs,
  GetDebriefArgs,
  GetOpenTasksArgs,
  GetScheduleArgs,
  HoursSummaryArgs,
  LogTimeArgs,
  TriggerSquareSyncArgs,
  ValidationResult,
  WriteDebriefArgs,
} from './types'
import { formatCurrency, formatDateTime, formatHours } from './format'
import {
  findMostRecentEntry,
  resolveClientId,
  resolveJobId,
  resolvePropertyId,
  resolveTaskId,
} from './lookup'
import {
  createClockSession,
  createTimeEntry,
  getActiveClockSession,
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
import {
  getDebrief,
  todayLocalDate,
  upsertDebrief,
} from '@/lib/domain/debriefs'

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

    const category = (categoryRaw as ClockInArgs['category']) || 'client_work'
    const billable = optionalBoolean(input.billable) ?? (category === 'client_work')

    return ok({
      category,
      client_id: optionalString(input.client_id),
      job_id: optionalString(input.job_id),
      property_id: optionalString(input.property_id),
      notes: optionalString(input.notes),
      billable,
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

    const billable = optionalBoolean(input.billable) ?? (category === 'client_work')

    return ok({
      start_time: range.start_time,
      end_time: range.end_time,
      minutes: typeof minutes === 'number' ? minutes : undefined,
      category: category as ValidatedLogTimeArgs['category'],
      client_id: optionalString(input.client_id),
      job_id: optionalString(input.job_id),
      property_id: optionalString(input.property_id),
      notes: optionalString(input.notes),
      billable,
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
    const lines = result.map(task => {
      const priority = task.priority ? ` [${task.priority}]` : ''
      const property = task.property?.name ? ` — ${task.property.name}` : ''
      return `• ${task.title}${property}${priority}`
    })
    return `Open tasks (${result.length}):\n${lines.join('\n')}`
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

type DebriefRow = Awaited<ReturnType<typeof upsertDebrief>>

const writeDebriefAction: AssistantActionDefinition<
  WriteDebriefArgs,
  { debrief: DebriefRow; appended: boolean }
> = {
  name: 'write_debrief',
  description: 'Create or update the day-level debrief notes for a date.',
  readOnly: false,
  validate(input) {
    if (!isRecord(input)) return fail('write_debrief args must be an object')

    const date = optionalString(input.date)
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return fail('date must be a YYYY-MM-DD string')
    }

    const summary = optionalString(input.summary)
    const wins = optionalString(input.wins)
    const blockers = optionalString(input.blockers)
    const followups = optionalString(input.followups)

    if (!summary && !wins && !blockers && !followups) {
      return fail('At least one of summary, wins, blockers, or followups is required')
    }

    return ok({
      date: date || todayLocalDate(),
      summary,
      wins,
      blockers,
      followups,
      append: optionalBoolean(input.append) ?? true,
    })
  },
  async execute(context, args) {
    const debrief = await upsertDebrief(context.supabase, args)
    return { debrief, appended: args.append === true }
  },
  format(result) {
    const fields: string[] = []
    if (result.debrief.summary) fields.push('summary')
    if (result.debrief.wins) fields.push('wins')
    if (result.debrief.blockers) fields.push('blockers')
    if (result.debrief.followups) fields.push('followups')
    const verb = result.appended ? 'Updated' : 'Saved'
    return `${verb} debrief for ${result.debrief.date} (${fields.join(', ') || 'empty'}).`
  },
}

const getDebriefAction: AssistantActionDefinition<
  GetDebriefArgs,
  { debrief: DebriefRow | null; date: string }
> = {
  name: 'get_debrief',
  description: 'Read the debrief notes for a date.',
  readOnly: true,
  validate(input) {
    if (input !== undefined && !isRecord(input)) {
      return fail('get_debrief args must be an object')
    }
    const date = isRecord(input) ? optionalString(input.date) : null
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return fail('date must be a YYYY-MM-DD string')
    }
    return ok({ date: date || todayLocalDate() })
  },
  async execute(context, args) {
    const debrief = await getDebrief(context.supabase, args.date)
    return { debrief, date: args.date || todayLocalDate() }
  },
  format(result) {
    if (!result.debrief) return `No debrief saved for ${result.date}.`
    const parts: string[] = []
    if (result.debrief.summary) parts.push(`Summary: ${result.debrief.summary}`)
    if (result.debrief.wins) parts.push(`Wins: ${result.debrief.wins}`)
    if (result.debrief.blockers) parts.push(`Blockers: ${result.debrief.blockers}`)
    if (result.debrief.followups) parts.push(`Follow-ups: ${result.debrief.followups}`)
    return `Debrief for ${result.date}:\n${parts.join('\n')}`
  },
}

type AnnotateEntryResult = {
  entry: { id: string; notes: string | null; client_id: string | null; property_id: string | null; job_id: string | null; billable: boolean }
  applied: { notes_appended: boolean; fields_set: string[] }
}

async function patchTimeEntry(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  entryId: string,
  patch: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('time_entries')
    .update(patch)
    .eq('id', entryId)
    .select('id, notes, client_id, property_id, job_id, billable')
    .single()
  if (error) throw new Error(error.message)
  return data
}

function buildEntryPatch(
  current: { notes: string | null; client_id: string | null; property_id: string | null; job_id: string | null; billable: boolean },
  args: { notes?: string | null; client_id?: string | null; property_id?: string | null; job_id?: string | null; billable?: boolean }
) {
  const patch: Record<string, unknown> = {}
  const fieldsSet: string[] = []
  let notesAppended = false

  if (args.notes) {
    const trimmed = args.notes.trim()
    patch.notes = current.notes ? `${current.notes}\n${trimmed}` : trimmed
    notesAppended = !!current.notes
    fieldsSet.push('notes')
  }
  if (args.client_id) {
    patch.client_id = args.client_id
    fieldsSet.push('client_id')
  }
  if (args.property_id) {
    patch.property_id = args.property_id
    fieldsSet.push('property_id')
  }
  if (args.job_id) {
    patch.job_id = args.job_id
    fieldsSet.push('job_id')
  }
  if (typeof args.billable === 'boolean') {
    patch.billable = args.billable
    fieldsSet.push('billable')
  }

  return { patch, fieldsSet, notesAppended }
}

const annotateEntryAction: AssistantActionDefinition<
  AnnotateEntryArgs,
  AnnotateEntryResult
> = {
  name: 'annotate_entry',
  description: 'Patch the most recent time entry — add notes or fix client/property/job after the fact.',
  readOnly: false,
  validate(input) {
    if (!isRecord(input)) return fail('annotate_entry args must be an object')
    const hasAny =
      optionalString(input.notes) ||
      optionalString(input.client_id) ||
      optionalString(input.property_id) ||
      optionalString(input.job_id) ||
      typeof input.billable === 'boolean'
    if (!hasAny) {
      return fail('Provide at least one of notes, client_id, property_id, job_id, or billable')
    }
    return ok({
      entry_id: optionalString(input.entry_id),
      notes: optionalString(input.notes),
      client_id: optionalString(input.client_id),
      property_id: optionalString(input.property_id),
      job_id: optionalString(input.job_id),
      billable: optionalBoolean(input.billable),
    })
  },
  async execute(context, args) {
    let target: {
      id: string
      notes: string | null
      client_id: string | null
      property_id: string | null
      job_id: string | null
      billable: boolean
    } | null = null

    if (args.entry_id) {
      const { data, error } = await context.supabase
        .from('time_entries')
        .select('id, notes, client_id, property_id, job_id, billable')
        .eq('id', args.entry_id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      target = data
    } else {
      target = await findMostRecentEntry(context.supabase, { lookbackDays: 2 })
    }

    if (!target) throw new Error('No recent time entry found to annotate')

    const { patch, fieldsSet, notesAppended } = buildEntryPatch(target, args)
    const updated = await patchTimeEntry(context.supabase, target.id, patch)

    return {
      entry: updated,
      applied: { fields_set: fieldsSet, notes_appended: notesAppended },
    }
  },
  format(result) {
    const fields = result.applied.fields_set.join(', ') || 'no changes'
    return `Updated last entry (${fields}).`
  },
}

type AnnotateSessionResult = {
  target: 'session' | 'entry'
  fields_set: string[]
  notes_appended: boolean
}

const annotateSessionAction: AssistantActionDefinition<
  AnnotateSessionArgs,
  AnnotateSessionResult
> = {
  name: 'annotate_session',
  description: 'Patch the active clock session — or fall back to the last time entry if not clocked in.',
  readOnly: false,
  validate(input) {
    if (!isRecord(input)) return fail('annotate_session args must be an object')
    const hasAny =
      optionalString(input.notes) ||
      optionalString(input.client_id) ||
      optionalString(input.property_id) ||
      optionalString(input.job_id) ||
      typeof input.billable === 'boolean'
    if (!hasAny) {
      return fail('Provide at least one of notes, client_id, property_id, job_id, or billable')
    }
    return ok({
      notes: optionalString(input.notes),
      client_id: optionalString(input.client_id),
      property_id: optionalString(input.property_id),
      job_id: optionalString(input.job_id),
      billable: optionalBoolean(input.billable),
    })
  },
  async execute(context, args) {
    const session = await getActiveClockSession(context.supabase)

    if (session) {
      const { patch, fieldsSet, notesAppended } = buildEntryPatch(
        {
          notes: session.notes ?? null,
          client_id: session.client_id ?? null,
          property_id: session.property_id ?? null,
          job_id: session.job_id ?? null,
          billable: session.billable ?? false,
        },
        args
      )
      const { error } = await context.supabase
        .from('active_clock_sessions')
        .update(patch)
        .eq('id', session.id)
      if (error) throw new Error(error.message)
      return { target: 'session' as const, fields_set: fieldsSet, notes_appended: notesAppended }
    }

    const recent = await findMostRecentEntry(context.supabase, { lookbackDays: 2 })
    if (!recent) throw new Error('Not clocked in and no recent entry to annotate')

    const { patch, fieldsSet, notesAppended } = buildEntryPatch(recent, args)
    await patchTimeEntry(context.supabase, recent.id, patch)
    return { target: 'entry' as const, fields_set: fieldsSet, notes_appended: notesAppended }
  },
  format(result) {
    const where = result.target === 'session' ? 'active session' : 'last entry'
    const fields = result.fields_set.join(', ') || 'no changes'
    return `Updated ${where} (${fields}).`
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
  write_debrief: writeDebriefAction,
  get_debrief: getDebriefAction,
  annotate_entry: annotateEntryAction,
  annotate_session: annotateSessionAction,
}

async function resolveEntityIds(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const resolved = { ...args }
  if (typeof resolved.client_id === 'string' && resolved.client_id) {
    resolved.client_id = await resolveClientId(supabase, resolved.client_id)
  }
  if (typeof resolved.property_id === 'string' && resolved.property_id) {
    // Scope property lookup to the resolved client when available
    const clientScope = typeof resolved.client_id === 'string' ? resolved.client_id : null
    resolved.property_id = await resolvePropertyId(supabase, resolved.property_id, clientScope)
  }
  if (typeof resolved.job_id === 'string' && resolved.job_id) {
    resolved.job_id = await resolveJobId(supabase, resolved.job_id)
  }
  if (typeof resolved.task_id === 'string' && resolved.task_id) {
    resolved.task_id = await resolveTaskId(supabase, resolved.task_id)
  }
  return resolved
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

  const resolved = await resolveEntityIds(context.supabase, validated.data)
  const result = await action.execute(context, resolved)
  const reply = action.format(result, resolved, context)

  return {
    ok: true,
    name,
    args: resolved as Record<string, unknown>,
    result,
    reply,
    readOnly: action.readOnly,
  }
}
