import type { CategoryType, Priority, CalendarBlockType } from '@/types'

export type AssistantSurface = 'app' | 'discord' | 'system'

export type AssistantActionName =
  | 'clock_in'
  | 'clock_out'
  | 'log_time'
  | 'create_task'
  | 'complete_task'
  | 'create_calendar_block'
  | 'get_status'
  | 'get_hours_summary'
  | 'get_billable_summary'
  | 'get_open_tasks'
  | 'get_schedule'
  | 'trigger_square_sync'
  | 'write_debrief'
  | 'get_debrief'
  | 'annotate_entry'
  | 'annotate_session'

export type AssistantHistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AssistantRequest = {
  message: string
  history?: AssistantHistoryMessage[]
}

export type AssistantResponse = {
  reply: string
  action?: {
    name: AssistantActionName
    args: Record<string, unknown>
    result: unknown
  }
  needsClarification?: boolean
}

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export type AssistantActionResult<TResult> = {
  ok: true
  name: AssistantActionName
  args: Record<string, unknown>
  result: TResult
  reply: string
  readOnly: boolean
}

export type LogTimeArgs = {
  start_time?: string
  end_time?: string
  minutes?: number
  category: CategoryType
  client_id?: string | null
  job_id?: string | null
  property_id?: string | null
  notes?: string | null
  billable?: boolean
  hourly_rate?: number | null
  source?: string
}

export type ClockInArgs = {
  category: CategoryType
  client_id?: string | null
  job_id?: string | null
  property_id?: string | null
  notes?: string | null
  billable?: boolean
  hourly_rate?: number | null
}

export type ClockOutArgs = {
  end_time?: string
  notes?: string | null
}

export type CreateTaskArgs = {
  title: string
  priority?: Priority
  due_date?: string | null
  client_id?: string | null
  property_id?: string | null
  job_id?: string | null
}

export type CompleteTaskArgs = {
  task_id?: string
  title?: string
}

export type CreateCalendarBlockArgs = {
  property_id?: string | null
  type?: CalendarBlockType
  start_date: string
  end_date: string
  notes?: string | null
  source?: string
}

export type HoursSummaryArgs = {
  start_date?: string
  end_date?: string
  period?: 'week' | 'month'
}

export type BillableSummaryArgs = {
  start_date?: string
  end_date?: string
  period?: 'week' | 'month'
}

export type GetOpenTasksArgs = {
  limit?: number
}

export type GetScheduleArgs = {
  start_date?: string
  end_date?: string
}

export type TriggerSquareSyncArgs = {
  force?: boolean
}

export type WriteDebriefArgs = {
  date?: string
  summary?: string | null
  wins?: string | null
  blockers?: string | null
  followups?: string | null
  append?: boolean
}

export type GetDebriefArgs = {
  date?: string
}

export type AnnotateEntryArgs = {
  entry_id?: string | null
  notes?: string | null
  client_id?: string | null
  property_id?: string | null
  job_id?: string | null
  billable?: boolean
}

export type AnnotateSessionArgs = {
  notes?: string | null
  client_id?: string | null
  property_id?: string | null
  job_id?: string | null
  billable?: boolean
}

export type AssistantActor = {
  surface: AssistantSurface
  userId?: string | null
  githubLogin?: string | null
  email?: string | null
  discordUserId?: string | null
}

export type AssistantParserResult =
  | {
      type: 'action'
      name: AssistantActionName
      args: Record<string, unknown>
    }
  | {
      type: 'clarify'
      question: string
    }
  | {
      type: 'unsupported'
      message: string
    }

export type AssistantActionDefinition<TArgs, TResult> = {
  name: AssistantActionName
  description: string
  readOnly: boolean
  validate: (input: unknown) => ValidationResult<TArgs>
  execute: (context: import('./context').AssistantContext, args: TArgs) => Promise<TResult>
  format: (result: TResult, args: TArgs, context: import('./context').AssistantContext) => string
}
