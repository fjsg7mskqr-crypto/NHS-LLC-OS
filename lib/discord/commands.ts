import type { AssistantActionName } from '@/lib/assistant/types'
import type { AssistantContext } from '@/lib/assistant/context'
import { resolveClientId, resolveJobId, resolvePropertyId, resolveTaskId } from '@/lib/assistant/lookup'

type DiscordOption = {
  name: string
  type: number
  value?: string | number | boolean
  options?: DiscordOption[]
}

type DiscordInteraction = {
  type: number
  id?: string
  token?: string
  application_id?: string
  channel_id?: string
  data?: {
    name: string
    options?: DiscordOption[]
  }
  member?: {
    user?: {
      id: string
      username?: string
    }
  }
  user?: {
    id: string
    username?: string
  }
}

type DiscordCommandExecution =
  | { type: 'action'; name: AssistantActionName; args: Record<string, unknown> }
  | { type: 'error'; message: string }

function getOption(options: DiscordOption[] | undefined, name: string): DiscordOption | undefined {
  return options?.find(option => option.name === name)
}

function getStringOption(options: DiscordOption[] | undefined, name: string) {
  const option = getOption(options, name)
  return typeof option?.value === 'string' ? option.value : null
}

function getNumberOption(options: DiscordOption[] | undefined, name: string) {
  const option = getOption(options, name)
  return typeof option?.value === 'number' ? option.value : null
}

function getBooleanOption(options: DiscordOption[] | undefined, name: string) {
  const option = getOption(options, name)
  return typeof option?.value === 'boolean' ? option.value : null
}

async function resolveEntityArgs(
  context: AssistantContext,
  input: {
    client?: string | null
    property?: string | null
    job?: string | null
  }
) {
  const client_id = await resolveClientId(context.supabase, input.client)
  const property_id = await resolvePropertyId(context.supabase, input.property)
  const job_id = await resolveJobId(context.supabase, input.job)

  return { client_id, property_id, job_id }
}

export async function mapDiscordInteractionToAction(
  interaction: DiscordInteraction,
  context: AssistantContext
): Promise<DiscordCommandExecution> {
  const name = interaction.data?.name
  const options = interaction.data?.options || []

  try {
    switch (name) {
      case 'status':
        return { type: 'action', name: 'get_status', args: {} }

      case 'sync':
        return { type: 'action', name: 'trigger_square_sync', args: {} }

      case 'clockin': {
        const entityArgs = await resolveEntityArgs(context, {
          client: getStringOption(options, 'client'),
          property: getStringOption(options, 'property'),
          job: getStringOption(options, 'job'),
        })

        return {
          type: 'action',
          name: 'clock_in',
          args: {
            category: getStringOption(options, 'category') || 'client_work',
            notes: getStringOption(options, 'notes'),
            billable: getBooleanOption(options, 'billable') ?? undefined,
            ...entityArgs,
          },
        }
      }

      case 'clockout':
        return {
          type: 'action',
          name: 'clock_out',
          args: {
            notes: getStringOption(options, 'notes'),
          },
        }

      case 'log': {
        const entityArgs = await resolveEntityArgs(context, {
          client: getStringOption(options, 'client'),
          property: getStringOption(options, 'property'),
          job: getStringOption(options, 'job'),
        })

        return {
          type: 'action',
          name: 'log_time',
          args: {
            minutes: getNumberOption(options, 'duration'),
            category: getStringOption(options, 'category') || 'client_work',
            notes: getStringOption(options, 'notes'),
            billable: getBooleanOption(options, 'billable') ?? undefined,
            source: 'discord',
            ...entityArgs,
          },
        }
      }

      case 'task': {
        const subcommand = options[0]
        const subcommandOptions = subcommand?.options || []

        if (subcommand?.name === 'add') {
          const entityArgs = await resolveEntityArgs(context, {
            client: getStringOption(subcommandOptions, 'client'),
            property: getStringOption(subcommandOptions, 'property'),
            job: getStringOption(subcommandOptions, 'job'),
          })

          return {
            type: 'action',
            name: 'create_task',
            args: {
              title: getStringOption(subcommandOptions, 'title'),
              priority: getStringOption(subcommandOptions, 'priority') || 'medium',
              due_date: getStringOption(subcommandOptions, 'due_date'),
              ...entityArgs,
            },
          }
        }

        if (subcommand?.name === 'done') {
          const taskValue = getStringOption(subcommandOptions, 'task')
          const taskId = await resolveTaskId(context.supabase, taskValue)
          return {
            type: 'action',
            name: 'complete_task',
            args: {
              task_id: taskId,
            },
          }
        }

        return { type: 'error', message: 'Unsupported task subcommand.' }
      }

      case 'block': {
        const property_id = await resolvePropertyId(
          context.supabase,
          getStringOption(options, 'property')
        )

        return {
          type: 'action',
          name: 'create_calendar_block',
          args: {
            property_id,
            type: getStringOption(options, 'type') || 'job_day',
            start_date: getStringOption(options, 'start_date'),
            end_date: getStringOption(options, 'end_date'),
            notes: getStringOption(options, 'notes'),
            source: 'discord',
          },
        }
      }

      default:
        return { type: 'error', message: `Unsupported command: ${name || 'unknown'}` }
    }
  } catch (error) {
    return {
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to parse Discord command',
    }
  }
}

export function getDiscordApplicationCommands() {
  return [
    {
      name: 'clockin',
      description: 'Start a timer now',
      options: [
        {
          type: 3,
          name: 'category',
          description: 'Time category',
          required: true,
          choices: [
            { name: 'Client Work', value: 'client_work' },
            { name: 'Drive Time', value: 'drive_time' },
            { name: 'Errand', value: 'errand' },
            { name: 'Prep', value: 'prep' },
            { name: 'Admin', value: 'admin' },
            { name: 'Equipment Maintenance', value: 'equipment_maint' },
          ],
        },
        { type: 3, name: 'client', description: 'Client name or UUID', required: false },
        { type: 3, name: 'property', description: 'Property name or UUID', required: false },
        { type: 3, name: 'job', description: 'Job title or UUID', required: false },
        { type: 5, name: 'billable', description: 'Override billable flag', required: false },
        { type: 3, name: 'notes', description: 'Notes', required: false },
      ],
    },
    {
      name: 'clockout',
      description: 'Stop timer and write the time entry',
      options: [{ type: 3, name: 'notes', description: 'Optional notes', required: false }],
    },
    {
      name: 'log',
      description: 'Add a time entry after the fact',
      options: [
        { type: 4, name: 'duration', description: 'Duration in minutes', required: true },
        {
          type: 3,
          name: 'category',
          description: 'Time category',
          required: true,
          choices: [
            { name: 'Client Work', value: 'client_work' },
            { name: 'Drive Time', value: 'drive_time' },
            { name: 'Errand', value: 'errand' },
            { name: 'Prep', value: 'prep' },
            { name: 'Admin', value: 'admin' },
            { name: 'Equipment Maintenance', value: 'equipment_maint' },
          ],
        },
        { type: 3, name: 'client', description: 'Client name or UUID', required: false },
        { type: 3, name: 'property', description: 'Property name or UUID', required: false },
        { type: 3, name: 'job', description: 'Job title or UUID', required: false },
        { type: 5, name: 'billable', description: 'Override billable flag', required: false },
        { type: 3, name: 'notes', description: 'Notes', required: false },
      ],
    },
    {
      name: 'task',
      description: 'Create or complete a task',
      options: [
        {
          type: 1,
          name: 'add',
          description: 'Create a task',
          options: [
            { type: 3, name: 'title', description: 'Task title', required: true },
            {
              type: 3,
              name: 'priority',
              description: 'Priority',
              required: false,
              choices: [
                { name: 'High', value: 'high' },
                { name: 'Medium', value: 'medium' },
                { name: 'Low', value: 'low' },
              ],
            },
            { type: 3, name: 'due_date', description: 'YYYY-MM-DD', required: false },
            { type: 3, name: 'client', description: 'Client name or UUID', required: false },
            { type: 3, name: 'property', description: 'Property name or UUID', required: false },
            { type: 3, name: 'job', description: 'Job title or UUID', required: false },
          ],
        },
        {
          type: 1,
          name: 'done',
          description: 'Complete a task',
          options: [
            { type: 3, name: 'task', description: 'Task title or UUID', required: true },
          ],
        },
      ],
    },
    {
      name: 'block',
      description: 'Block calendar dates',
      options: [
        { type: 3, name: 'property', description: 'Property name or UUID', required: true },
        { type: 3, name: 'start_date', description: 'YYYY-MM-DD', required: true },
        { type: 3, name: 'end_date', description: 'YYYY-MM-DD', required: true },
        {
          type: 3,
          name: 'type',
          description: 'Block type',
          required: false,
          choices: [
            { name: 'Job Day', value: 'job_day' },
            { name: 'SBR Booking', value: 'sbr_booking' },
          ],
        },
        { type: 3, name: 'notes', description: 'Optional notes', required: false },
      ],
    },
    {
      name: 'status',
      description: 'Current clock-in status and today summary',
    },
    {
      name: 'sync',
      description: 'Trigger Square sync manually',
    },
  ]
}
