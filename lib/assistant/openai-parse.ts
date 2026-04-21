import { getActiveClockSession, getHoursSummary } from '@/lib/domain/time'
import { listOpenTasks } from '@/lib/domain/tasks'
import { getSchedule } from '@/lib/domain/calendar'
import type { AssistantActionName, AssistantActor } from './types'

type ToolCallResult =
  | {
      type: 'action'
      name: AssistantActionName
      args: Record<string, unknown>
    }
  | {
      type: 'actions'
      actions: Array<{ name: AssistantActionName; args: Record<string, unknown> }>
    }
  | {
      type: 'message'
      message: string
    }

const ACTION_TOOLS = [
  {
    type: 'function',
    name: 'clock_in',
    description: 'Start a timer now.',
    strict: false,
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['client_work', 'drive_time', 'prep', 'admin', 'equipment_maint'],
        },
        client: { type: ['string', 'null'], description: 'Client name (e.g. "Miller")' },
        property: { type: ['string', 'null'], description: 'Property name (e.g. "Main Lodge")' },
        job: { type: ['string', 'null'], description: 'Job title (e.g. "deck repair")' },
        notes: { type: ['string', 'null'] },
        billable: { type: ['boolean', 'null'] },
      },
      required: ['category'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'clock_out',
    description: 'Stop the active timer and write the entry.',
    strict: false,
    parameters: {
      type: 'object',
      properties: {
        notes: { type: ['string', 'null'] },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'log_time',
    description: 'Log time after the fact. When the user gives specific start/end times (e.g. "9:30 AM to 10:45 AM"), use start_time and end_time as ISO 8601 strings in the user\'s timezone. When the user gives only a duration (e.g. "75 minutes"), use minutes instead.',
    strict: false,
    parameters: {
      type: 'object',
      properties: {
        minutes: { type: ['number', 'null'], description: 'Duration in minutes. Use this OR start_time+end_time, not both.' },
        start_time: { type: ['string', 'null'], description: 'ISO 8601 start time. Use with end_time when user gives specific times.' },
        end_time: { type: ['string', 'null'], description: 'ISO 8601 end time. Use with start_time when user gives specific times.' },
        category: {
          type: 'string',
          enum: ['client_work', 'drive_time', 'prep', 'admin', 'equipment_maint'],
        },
        client: { type: ['string', 'null'], description: 'Client name (e.g. "Miller")' },
        property: { type: ['string', 'null'], description: 'Property name (e.g. "Main Lodge")' },
        job: { type: ['string', 'null'], description: 'Job title (e.g. "deck repair")' },
        notes: { type: ['string', 'null'] },
        billable: { type: ['boolean', 'null'] },
      },
      required: ['category'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'create_task',
    description: 'Create an operational task.',
    strict: false,
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        priority: { type: ['string', 'null'], enum: ['high', 'medium', 'low', null] },
        due_date: { type: ['string', 'null'] },
        client: { type: ['string', 'null'], description: 'Client name (e.g. "Miller")' },
        property: { type: ['string', 'null'], description: 'Property name (e.g. "Main Lodge")' },
        job: { type: ['string', 'null'], description: 'Job title (e.g. "deck repair")' },
      },
      required: ['title'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'complete_task',
    description: 'Mark a task complete.',
    strict: false,
    parameters: {
      type: 'object',
      properties: {
        task: { type: ['string', 'null'], description: 'Task title or partial match (e.g. "order mulch")' },
        title: { type: ['string', 'null'] },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'create_calendar_block',
    description: 'Create a calendar block for a property.',
    strict: false,
    parameters: {
      type: 'object',
      properties: {
        property: { type: ['string', 'null'], description: 'Property name (e.g. "Main Lodge")' },
        type: { type: ['string', 'null'], enum: ['job_day', 'sbr_booking', null] },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
        notes: { type: ['string', 'null'] },
      },
      required: ['start_date', 'end_date'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_open_tasks',
    description: 'List the user\'s open tasks. Use this when the user asks what tasks they have, what to do today, or wants to see their task list.',
    strict: false,
    parameters: {
      type: 'object',
      properties: {
        limit: { type: ['number', 'null'], description: 'Max tasks to return (default 10)' },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_status',
    description: 'Get current operational status.',
    strict: false,
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_billable_summary',
    description: 'Get billable summary, usually month to date.',
    strict: false,
    parameters: {
      type: 'object',
      properties: {
        period: { type: ['string', 'null'], enum: ['week', 'month', null] },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'trigger_square_sync',
    description: 'Run the Square sync now.',
    strict: false,
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'write_debrief',
    description: 'Save end-of-day reflection notes for a date. Use when the user reflects on what they did, wins, blockers, or follow-ups for a day. Defaults to today and APPENDS by default — multiple messages on the same day build up the same debrief.',
    strict: false,
    parameters: {
      type: 'object',
      properties: {
        date: { type: ['string', 'null'], description: 'YYYY-MM-DD. Defaults to today.' },
        summary: { type: ['string', 'null'], description: 'Free-form recap of what happened today.' },
        wins: { type: ['string', 'null'] },
        blockers: { type: ['string', 'null'] },
        followups: { type: ['string', 'null'] },
        append: { type: ['boolean', 'null'], description: 'Default true. Set false only if user explicitly says "replace" or "overwrite".' },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_debrief',
    description: 'Read the debrief notes for a date. Defaults to today.',
    strict: false,
    parameters: {
      type: 'object',
      properties: {
        date: { type: ['string', 'null'], description: 'YYYY-MM-DD. Defaults to today.' },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'annotate_entry',
    description: 'Patch the most recent time entry — add notes or fix a missing client/property/job after the fact. Use when the user says "that last entry was…", "the block I just logged was at X", "add notes to my last clock-out", etc. Does NOT create a new entry.',
    strict: false,
    parameters: {
      type: 'object',
      properties: {
        notes: { type: ['string', 'null'], description: 'Notes to APPEND to the entry.' },
        client: { type: ['string', 'null'], description: 'Client name to attach (e.g. "SBR").' },
        property: { type: ['string', 'null'], description: 'Property name to attach.' },
        job: { type: ['string', 'null'], description: 'Job title to attach.' },
        billable: { type: ['boolean', 'null'] },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'annotate_session',
    description: 'Patch the active clock session — set a missing client/property/job or add notes mid-shift. If not currently clocked in, falls back to the most recent entry. Use when the user says "I\'m at SBR now", "add a note to my current timer", etc.',
    strict: false,
    parameters: {
      type: 'object',
      properties: {
        notes: { type: ['string', 'null'], description: 'Notes to APPEND.' },
        client: { type: ['string', 'null'] },
        property: { type: ['string', 'null'] },
        job: { type: ['string', 'null'] },
        billable: { type: ['boolean', 'null'] },
      },
      required: [],
      additionalProperties: false,
    },
  },
] as const

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  return key
}

function getOpenAIModel() {
  return process.env.OPENAI_ASSISTANT_MODEL || 'gpt-5.4-mini'
}

type EntityContextCache = { value: string; expires: number }
let entityContextCache: EntityContextCache | null = null
const ENTITY_CONTEXT_TTL_MS = 5 * 60 * 1000

async function loadLiveContext(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  timezone: string
): Promise<string> {
  const [sessionRes, hoursRes, tasksRes, scheduleRes] = await Promise.allSettled([
    getActiveClockSession(supabase),
    getHoursSummary(supabase, { period: 'week' }),
    listOpenTasks(supabase, 5),
    getSchedule(supabase),
  ])

  const parts: string[] = []

  if (sessionRes.status === 'fulfilled' && sessionRes.value) {
    const session = sessionRes.value
    const startedMs = new Date(session.started_at).getTime()
    const elapsedMin = Math.max(0, Math.round((Date.now() - startedMs) / 60_000))
    const h = Math.floor(elapsedMin / 60)
    const m = elapsedMin % 60
    const elapsed = h > 0 ? `${h}h ${m}m` : `${m}m`
    parts.push(`Active timer: ${session.category} for ${elapsed} (started ${new Date(session.started_at).toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' })}).`)
  } else {
    parts.push('Active timer: none (not clocked in).')
  }

  if (hoursRes.status === 'fulfilled') {
    const totalHours = Math.round((hoursRes.value.minutes / 60) * 10) / 10
    parts.push(`Hours this week: ${totalHours}h.`)
  }

  if (tasksRes.status === 'fulfilled' && tasksRes.value?.length) {
    const titles = tasksRes.value
      .slice(0, 5)
      .map(t => {
        const due = t.due_date ? ` (due ${t.due_date})` : ''
        const pri = t.priority && t.priority !== 'medium' ? ` [${t.priority}]` : ''
        return `${t.title}${pri}${due}`
      })
      .join('; ')
    parts.push(`Top open tasks: ${titles}.`)
  }

  if (scheduleRes.status === 'fulfilled') {
    const blocks = scheduleRes.value?.blocks ?? []
    if (blocks.length) {
      const names = blocks
        .map(b => {
          const prop = (b as { property?: { name?: string } }).property?.name
          const notes = (b as { notes?: string }).notes
          return prop || notes || (b as { type?: string }).type || 'block'
        })
        .join(', ')
      parts.push(`Today's schedule: ${names}.`)
    } else {
      parts.push(`Today's schedule: nothing on the calendar.`)
    }
  }

  return parts.join(' ')
}

async function loadEntityContext(
  supabase: import('@supabase/supabase-js').SupabaseClient
): Promise<string> {
  const now = Date.now()
  if (entityContextCache && entityContextCache.expires > now) {
    return entityContextCache.value
  }

  try {
    const [clients, jobs, properties] = await Promise.all([
      supabase.from('clients').select('name').is('deleted_at', null).order('name').limit(50),
      supabase.from('jobs').select('title, client:clients(name)').is('deleted_at', null).in('status', ['scheduled', 'in_progress', 'active']).order('title').limit(50),
      supabase.from('properties').select('name, client:clients(name)').order('name').limit(50),
    ])
    const parts: string[] = []
    if (clients.data?.length) {
      parts.push(`Known clients: ${clients.data.map(c => c.name).join(', ')}.`)
    }
    if (jobs.data?.length) {
      parts.push(`Active jobs: ${jobs.data.map(j => {
        const client = j.client as unknown as { name: string } | null
        return `${j.title}${client ? ` (${client.name})` : ''}`
      }).join(', ')}.`)
    }
    if (properties.data?.length) {
      parts.push(`Properties: ${properties.data.map(p => {
        const client = p.client as unknown as { name: string } | null
        return `${p.name}${client ? ` (${client.name})` : ''}`
      }).join(', ')}.`)
    }
    const value = parts.join(' ')
    entityContextCache = { value, expires: now + ENTITY_CONTEXT_TTL_MS }
    return value
  } catch {
    return ''
  }
}

/**
 * Map a known IANA timezone to its current UTC offset string (e.g. "-04:00").
 * Used as a fallback when the model emits clock times that should be interpreted
 * as local — we anchor them to today + this offset.
 */
function getTimezoneOffset(timezone: string, dateISO: string): string {
  // Use Intl to get the offset for a given date in the given timezone.
  const d = new Date(`${dateISO}T12:00:00Z`)
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  })
  const parts = fmt.formatToParts(d)
  const tzName = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+0'
  // tzName looks like "GMT-4" or "GMT+5:30" — normalize to "-04:00"
  const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
  if (!match) return '+00:00'
  const sign = match[1]
  const hh = match[2].padStart(2, '0')
  const mm = (match[3] || '00').padStart(2, '0')
  return `${sign}${hh}:${mm}`
}

/**
 * Detect an explicit clock-time range in the user's message (e.g. "9:30-10:45",
 * "9 to 11am", "from 9:00 to 12:30"). Returns ISO strings anchored to today
 * in the user's timezone if matched, else null.
 *
 * Conservative on purpose: only fires when both endpoints are clearly clock
 * times. A bare "75 minutes" or "an hour" never triggers this.
 */
export function extractClockRange(
  message: string,
  todayISO: string,
  timezone: string
): { start: string; end: string } | null {
  // Match patterns like "9:30-10:45", "9-11", "9:30 to 10:45", "9am to 11am"
  const re = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?\s*[-–—]|\bto\b\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?/i
  // Simpler: find two clock times near each other with a separator
  const pattern = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?\s*(?:[-–—]|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?\b/i
  const m = message.match(pattern)
  void re
  if (!m) return null

  const parseTime = (h: string, min: string | undefined, mer: string | undefined, contextMer?: string): { h: number; m: number } | null => {
    let hour = parseInt(h, 10)
    const minute = min ? parseInt(min, 10) : 0
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
    const meridiem = (mer || contextMer || '').toLowerCase()
    if (meridiem.startsWith('p') && hour < 12) hour += 12
    if (meridiem.startsWith('a') && hour === 12) hour = 0
    return { h: hour, m: minute }
  }

  // If only the end has a meridiem (e.g. "9-11am"), apply it to the start too
  // when the start is ambiguous (no meridiem, hour <= 12).
  const startMer = m[3]
  const endMer = m[6]
  const inferredMer = startMer || endMer

  const start = parseTime(m[1], m[2], startMer, inferredMer)
  const end = parseTime(m[4], m[5], endMer, inferredMer)
  if (!start || !end) return null

  // Reject nonsensical ranges (start >= end and not crossing meridian).
  if (start.h * 60 + start.m >= end.h * 60 + end.m) return null

  const offset = getTimezoneOffset(timezone, todayISO)
  const fmt = (t: { h: number; m: number }) =>
    `${todayISO}T${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}:00${offset}`

  return { start: fmt(start), end: fmt(end) }
}

export async function chooseAssistantActionWithOpenAI(input: {
  message: string
  actor: AssistantActor
  timezone?: string
  supabase?: import('@supabase/supabase-js').SupabaseClient
}): Promise<ToolCallResult> {
  const tz = input.timezone || 'America/Detroit'
  const nowLocal = new Date().toLocaleString('en-US', { timeZone: tz })
  const todayISO = new Date(
    new Date().toLocaleString('en-US', { timeZone: tz })
  ).toISOString().slice(0, 10)

  // Fetch known entity names (cached 5min) + live state (fresh every call) in parallel
  const [entityContext, liveContext] = await Promise.all([
    input.supabase ? loadEntityContext(input.supabase) : Promise.resolve(''),
    input.supabase ? loadLiveContext(input.supabase, tz) : Promise.resolve(''),
  ])

  const openaiController = new AbortController()
  const openaiTimeout = setTimeout(() => openaiController.abort(), 30000)

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      'Content-Type': 'application/json',
    },
    signal: openaiController.signal,
    body: JSON.stringify({
      model: getOpenAIModel(),
      instructions: [
        'You are a friendly operations assistant for a landscaping/field-service business.',
        'You talk like a helpful coworker, not a robot. Keep replies short and casual.',
        'Choose one or more functions when the user intent is clear and executable. If the user describes multiple entries or actions in one message (e.g. "log 9 to 10 for SBR and 10:15 to 11:30 drive time"), call the function once per entry.',
        'Use sensible defaults: category defaults to client_work, billable defaults to true for client_work.',
        'If the user says "log time" or "time card entry", you only need to ask how long (minutes or hours) — everything else is optional.',
        `The user is in the ${tz} timezone. The current local time is ${nowLocal} and today's date is ${todayISO}.`,
        'CRITICAL TIME RULE: When the user provides explicit clock times (like "9:30 to 10:45", "9:30am-10:45am", "from 9 to 11"), you MUST use start_time and end_time as ISO 8601 strings for the user\'s local date in their timezone. DO NOT use minutes. DO NOT use the current time. Example: input "log 9:30-10:45 today" with today=' + todayISO + ' and tz=' + tz + ' → start_time="' + todayISO + 'T09:30:00" end_time="' + todayISO + 'T10:45:00". Only use minutes when the user gives ONLY a duration with no clock times (e.g. "log 75 minutes admin").',
        'When you need clarification, ask ONE simple follow-up question in plain English. Never list raw field names or IDs.',
        'For example, ask "How long did you work?" not "Please provide: minutes, category, client_id...".',
        entityContext
          ? `${entityContext} When the user mentions a client, property, or job, match it to one of these known names and pass the matching name in the client/property/job parameter. For example, if the user says "sleeping bear resort" and there is a client called "SBR", pass client="SBR".`
          : '',
        liveContext ? `CURRENT STATE: ${liveContext} Use this state to disambiguate references like "the current timer", "the last entry", or "same as before". Reference it when answering questions.` : '',
        'CHAT MODE: When the user asks a question (e.g. "how\'s my week?", "am I behind?", "what\'s on my plate today?", "what\'s outstanding?", "how much did I bill this month?"), call the relevant read-only tool (get_status, get_hours_summary, get_billable_summary, get_open_tasks, get_schedule, get_debrief) — the system will synthesize a natural conversational answer from the result. Don\'t refuse to answer; pick the closest tool. If the user just wants to chat and no tool fits, answer briefly as text.',
        'When referencing clients, properties, or jobs, always pass the name in the client/property/job parameter — never put it in notes. Never guess or fabricate UUIDs — the system resolves names automatically.',
        'Never invent clients, properties, jobs, tasks, or dates.',
        'If the user asks about billing this month, use get_billable_summary with period=month.',
        'If the user asks for status, use get_status.',
        'If the user asks what tasks they have, what to do today, or to see their task list, use get_open_tasks (NOT get_status).',
        'DEBRIEFS: When the user reflects on what they did today/this morning/this afternoon, names wins or blockers, or sends an end-of-day recap, use write_debrief with append=true. DO NOT create a time entry for a reflection. Examples: "today I finished the Den deck and started painting" → write_debrief; "blocker: waiting on stain delivery" → write_debrief.',
        'ANNOTATIONS: When the user references something already logged ("that last entry…", "the block I just clocked out…", "add a note to my last timer", "I forgot to set the client on…"), use annotate_entry. When they reference the active timer ("I\'m at SBR now", "switch the current timer to drive time", "add notes to my current shift"), use annotate_session. DO NOT create new entries for these.',
        'NEVER call log_time when the user is reflecting, annotating, or correcting an existing entry — those are write_debrief, annotate_entry, or annotate_session.',
      ].filter(Boolean).join(' '),
      input: input.message,
      tools: ACTION_TOOLS,
    }),
  })

  clearTimeout(openaiTimeout)

  const payload = await response.json() as {
    error?: { message?: string }
    output?: Array<{
      type: string
      name?: string
      arguments?: string
      content?: Array<{ type?: string; text?: string }>
    }>
    output_text?: string
  }

  if (!response.ok) {
    throw new Error(payload?.error?.message || 'OpenAI parse request failed')
  }

  const toolCalls = payload.output?.filter(item => item.type === 'function_call') || []

  if (toolCalls.length > 0) {
    const parsed = toolCalls.map(tc => {
      let args: Record<string, unknown> = {}
      if (tc.arguments) {
        try {
          args = JSON.parse(tc.arguments) as Record<string, unknown>
        } catch {
          throw new Error('OpenAI returned invalid function arguments')
        }
      }

      // Remap friendly names to _id keys for downstream resolution
      if (args.client !== undefined) { args.client_id = args.client; delete args.client }
      if (args.property !== undefined) { args.property_id = args.property; delete args.property }
      if (args.job !== undefined) { args.job_id = args.job; delete args.job }
      if (args.task !== undefined) { args.task_id = args.task; delete args.task }

      // Safety net for the log_time literal-time bug: if the user message contained
      // an explicit time range but the model only returned minutes (anchored to "now"),
      // reconstruct start_time/end_time from the message and drop minutes.
      if (tc.name === 'log_time') {
        const hadExplicitRange = extractClockRange(input.message, todayISO, tz)
        const hasIsoTimes = typeof args.start_time === 'string' && typeof args.end_time === 'string'
        if (hadExplicitRange && !hasIsoTimes) {
          args.start_time = hadExplicitRange.start
          args.end_time = hadExplicitRange.end
          delete args.minutes
        }
      }

      return { name: tc.name as AssistantActionName, args }
    })

    // Single action → original format for backward compatibility
    if (parsed.length === 1) {
      return { type: 'action', name: parsed[0].name, args: parsed[0].args }
    }

    return { type: 'actions', actions: parsed }
  }

  const message =
    payload.output_text?.trim() ||
    payload.output
      ?.flatMap(item => item.content || [])
      .map(item => item.text || '')
      .join(' ')
      .trim()

  return {
    type: 'message',
    message: message || 'What exactly do you want me to do?',
  }
}

/**
 * Second-pass synthesis: given the user's original question plus the JSON
 * results of one or more read-only tool calls, produce a short, natural reply.
 * Used only when every action the model chose was read-only (chat-mode path).
 */
export async function synthesizeChatReply(input: {
  userMessage: string
  toolResults: Array<{ name: string; result: unknown }>
  timezone?: string
}): Promise<string> {
  const tz = input.timezone || 'America/Detroit'
  const nowLocal = new Date().toLocaleString('en-US', { timeZone: tz })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getOpenAIKey()}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: getOpenAIModel(),
        instructions: [
          'You are a friendly operations coworker. Answer the user\'s question based on the tool results provided.',
          'Keep it short: 1-3 sentences, casual tone. No bullet lists unless the user asked for one.',
          'Do not repeat raw JSON — summarize. Round hours to one decimal. Format money as $1,234.56.',
          'If the data answers the question directly, give the answer plus one helpful detail.',
          'If the data is empty or doesn\'t match the question, say so honestly in one sentence.',
          `Timezone: ${tz}. Current local time: ${nowLocal}.`,
        ].join(' '),
        input: `User asked: "${input.userMessage}"\n\nTool results:\n${input.toolResults.map(r => `- ${r.name}: ${JSON.stringify(r.result)}`).join('\n')}`,
      }),
    })

    const payload = await response.json() as {
      error?: { message?: string }
      output_text?: string
      output?: Array<{ content?: Array<{ text?: string }> }>
    }

    if (!response.ok) {
      throw new Error(payload?.error?.message || 'OpenAI synthesis failed')
    }

    const text =
      payload.output_text?.trim() ||
      payload.output
        ?.flatMap(item => item.content || [])
        .map(item => item.text || '')
        .join(' ')
        .trim()

    return text || 'Not sure how to answer that, but the data came back fine.'
  } finally {
    clearTimeout(timeout)
  }
}
