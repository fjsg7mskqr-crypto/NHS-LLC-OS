import type { AssistantActionName, AssistantActor } from './types'

type ToolCallResult =
  | {
      type: 'action'
      name: AssistantActionName
      args: Record<string, unknown>
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
] as const

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  return key
}

function getOpenAIModel() {
  return process.env.OPENAI_ASSISTANT_MODEL || 'gpt-5-mini'
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

  // Fetch known entity names so OpenAI can recognize them
  let entityContext = ''
  if (input.supabase) {
    try {
      const [clients, jobs, properties] = await Promise.all([
        input.supabase.from('clients').select('name').is('deleted_at', null).order('name').limit(50),
        input.supabase.from('jobs').select('title, client:clients(name)').is('deleted_at', null).in('status', ['scheduled', 'in_progress', 'active']).order('title').limit(50),
        input.supabase.from('properties').select('name, client:clients(name)').order('name').limit(50),
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
      if (parts.length) entityContext = parts.join(' ')
    } catch {
      // Non-fatal — proceed without entity context
    }
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getOpenAIModel(),
      instructions: [
        'You are a friendly operations assistant for a landscaping/field-service business.',
        'You talk like a helpful coworker, not a robot. Keep replies short and casual.',
        'Choose exactly one function when the user intent is clear and executable.',
        'Use sensible defaults: category defaults to client_work, billable defaults to true for client_work.',
        'If the user says "log time" or "time card entry", you only need to ask how long (minutes or hours) — everything else is optional.',
        `The user is in the ${tz} timezone. The current local time is ${nowLocal} and today's date is ${todayISO}.`,
        'When the user provides specific start and end times (like "9:30 AM to 10:45 AM"), use start_time and end_time as ISO 8601 strings for today in their timezone. Do NOT convert to minutes — pass the exact times.',
        'When you need clarification, ask ONE simple follow-up question in plain English. Never list raw field names or IDs.',
        'For example, ask "How long did you work?" not "Please provide: minutes, category, client_id...".',
        entityContext
          ? `${entityContext} When the user mentions a client, property, or job, match it to one of these known names and pass the matching name in the client/property/job parameter. For example, if the user says "sleeping bear resort" and there is a client called "SBR", pass client="SBR".`
          : '',
        'When referencing clients, properties, or jobs, always pass the name in the client/property/job parameter — never put it in notes. Never guess or fabricate UUIDs — the system resolves names automatically.',
        'Never invent clients, properties, jobs, tasks, or dates.',
        'If the user asks about billing this month, use get_billable_summary with period=month.',
        'If the user asks for status, use get_status.',
      ].filter(Boolean).join(' '),
      input: input.message,
      tools: ACTION_TOOLS,
    }),
  })

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

  const toolCall = payload.output?.find(item => item.type === 'function_call')
  if (toolCall?.name) {
    let args: Record<string, unknown> = {}
    if (toolCall.arguments) {
      try {
        args = JSON.parse(toolCall.arguments) as Record<string, unknown>
      } catch {
        throw new Error('OpenAI returned invalid function arguments')
      }
    }

    // Remap friendly names to _id keys for downstream resolution
    if (args.client !== undefined) { args.client_id = args.client; delete args.client }
    if (args.property !== undefined) { args.property_id = args.property; delete args.property }
    if (args.job !== undefined) { args.job_id = args.job; delete args.job }
    if (args.task !== undefined) { args.task_id = args.task; delete args.task }

    return {
      type: 'action',
      name: toolCall.name as AssistantActionName,
      args,
    }
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
