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
          enum: ['client_work', 'drive_time', 'errand', 'prep', 'admin', 'equipment_maint'],
        },
        client_id: { type: ['string', 'null'] },
        property_id: { type: ['string', 'null'] },
        job_id: { type: ['string', 'null'] },
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
          enum: ['client_work', 'drive_time', 'errand', 'prep', 'admin', 'equipment_maint'],
        },
        client_id: { type: ['string', 'null'] },
        property_id: { type: ['string', 'null'] },
        job_id: { type: ['string', 'null'] },
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
        client_id: { type: ['string', 'null'] },
        property_id: { type: ['string', 'null'] },
        job_id: { type: ['string', 'null'] },
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
        task_id: { type: ['string', 'null'] },
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
        property_id: { type: ['string', 'null'] },
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
}): Promise<ToolCallResult> {
  const tz = input.timezone || 'America/Detroit'
  const nowLocal = new Date().toLocaleString('en-US', { timeZone: tz })
  const todayISO = new Date(
    new Date().toLocaleString('en-US', { timeZone: tz })
  ).toISOString().slice(0, 10)

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
        'Never invent clients, properties, jobs, tasks, or dates.',
        'If the user asks about billing this month, use get_billable_summary with period=month.',
        'If the user asks for status, use get_status.',
      ].join(' '),
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
