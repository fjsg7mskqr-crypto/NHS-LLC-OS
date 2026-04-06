import type { AssistantParserResult, AssistantRequest } from './types'
import type { CategoryType, Priority } from '@/types'

const CATEGORY_ALIASES: Array<{ pattern: RegExp; category: CategoryType }> = [
  { pattern: /\badmin\b/, category: 'admin' },
  { pattern: /\bdrive\b/, category: 'drive_time' },

  { pattern: /\bprep\b/, category: 'prep' },
  { pattern: /\bequipment|maint\b/, category: 'equipment_maint' },
  { pattern: /\bclient work|job work|billable\b/, category: 'client_work' },
]

function detectCategory(message: string): CategoryType {
  for (const entry of CATEGORY_ALIASES) {
    if (entry.pattern.test(message)) {
      return entry.category
    }
  }

  return 'client_work'
}

function detectPriority(message: string): Priority {
  if (/\bhigh\b/.test(message)) return 'high'
  if (/\blow\b/.test(message)) return 'low'
  return 'medium'
}

function parseDurationMinutes(message: string) {
  const hoursAndMinutes = message.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h)\b/)
  const minutesOnly = message.match(/(\d+(?:\.\d+)?)\s*(minutes?|mins?|m)\b/)

  let minutes = 0
  if (hoursAndMinutes) {
    minutes += Math.round(Number(hoursAndMinutes[1]) * 60)
  }
  if (minutesOnly) {
    minutes += Math.round(Number(minutesOnly[1]))
  }

  return minutes || null
}

function parseCreateTask(message: string): AssistantParserResult {
  const titleMatch =
    message.match(/\b(?:add|create)\b(?:\s+a)?(?:\s+\w+)?\s+task(?:\s+to)?\s+(.+)$/) ||
    message.match(/\btask\s+(?:to|called)\s+(.+)$/)

  const title = titleMatch?.[1]?.trim()
  if (!title) {
    return {
      type: 'clarify',
      question: 'What should the task title be?',
    }
  }

  return {
    type: 'action',
    name: 'create_task',
    args: {
      title,
      priority: detectPriority(message),
    },
  }
}

function parseLogTime(message: string): AssistantParserResult {
  const minutes = parseDurationMinutes(message)
  if (!minutes) {
    return {
      type: 'clarify',
      question: 'How much time should I log?',
    }
  }

  return {
    type: 'action',
    name: 'log_time',
    args: {
      minutes,
      category: detectCategory(message),
      notes: message,
      billable: /\bbillable\b/.test(message),
    },
  }
}

export function parseAssistantRequest(request: AssistantRequest): AssistantParserResult {
  const message = request.message.trim()
  const normalized = message.toLowerCase()

  if (!message) {
    return { type: 'clarify', question: 'What do you want me to do?' }
  }

  if (/\bwhat did i bill\b|\bbillable\b|\bbilled this month\b/.test(normalized)) {
    return { type: 'action', name: 'get_billable_summary', args: { period: 'month' } }
  }

  if (/\bthis week\b.*\bhours\b|\bhours this week\b/.test(normalized)) {
    return { type: 'action', name: 'get_hours_summary', args: { period: 'week' } }
  }

  if (/\bstatus\b|\bwhat's my status\b|\bwhat is my status\b/.test(normalized)) {
    return { type: 'action', name: 'get_status', args: {} }
  }

  if (/\bopen tasks\b|\bwhat tasks\b/.test(normalized)) {
    return { type: 'action', name: 'get_open_tasks', args: { limit: 10 } }
  }

  if (/\btoday('?s)? schedule\b|\bschedule today\b/.test(normalized)) {
    return { type: 'action', name: 'get_schedule', args: {} }
  }

  if (/\bsync square\b|\bsquare sync\b/.test(normalized)) {
    return { type: 'action', name: 'trigger_square_sync', args: {} }
  }

  if (/\bclock in\b/.test(normalized)) {
    return {
      type: 'action',
      name: 'clock_in',
      args: {
        category: detectCategory(normalized),
        billable: /\bbillable\b/.test(normalized),
        notes: message,
      },
    }
  }

  if (/\bclock out\b/.test(normalized)) {
    return { type: 'action', name: 'clock_out', args: { notes: message } }
  }

  if (/\bcomplete task\b|\bmark .* done\b|\bdone with\b/.test(normalized)) {
    const titleMatch = normalized.match(/\b(?:complete task|mark|done with)\b\s+(.+)$/)
    const title = titleMatch?.[1]?.replace(/\bdone\b/g, '').trim()
    if (!title) {
      return { type: 'clarify', question: 'Which task should I complete?' }
    }
    return { type: 'action', name: 'complete_task', args: { title } }
  }

  if (/\badd\b.*\btask\b|\bcreate\b.*\btask\b/.test(normalized)) {
    return parseCreateTask(normalized)
  }

  if (/\blog\b.*\btime\b|\blog\b.*\bminutes?\b|\blog\b.*\bhours?\b/.test(normalized)) {
    return parseLogTime(message)
  }

  if (/\bblock\b|\bcalendar\b/.test(normalized)) {
    const dateMatch = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b/)
    if (!dateMatch) {
      return { type: 'clarify', question: 'What date should I block?' }
    }
    return {
      type: 'action',
      name: 'create_calendar_block',
      args: {
        start_date: dateMatch[1],
        end_date: dateMatch[1],
        type: /\bbooking\b/.test(normalized) ? 'sbr_booking' : 'job_day',
        notes: message,
      },
    }
  }

  return {
    type: 'unsupported',
    message:
      'I can currently handle status, billable summary, hours summary, open tasks, task creation/completion, time logging, calendar blocks, clock in/out, and Square sync.',
  }
}
