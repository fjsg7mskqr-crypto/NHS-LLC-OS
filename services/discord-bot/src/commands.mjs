import { SlashCommandBuilder } from 'discord.js'

export const commands = [
  new SlashCommandBuilder()
    .setName('clockin')
    .setDescription('Start a timer now')
    .addStringOption(opt =>
      opt.setName('category').setDescription('Work category')
        .setRequired(false)
        .addChoices(
          { name: 'Client Work', value: 'client_work' },
          { name: 'Drive Time', value: 'drive_time' },
          { name: 'Prep', value: 'prep' },
          { name: 'Admin', value: 'admin' },
          { name: 'Equipment Maint.', value: 'equipment_maint' },
        ))
    .addStringOption(opt =>
      opt.setName('client').setDescription('Client name').setRequired(false))
    .addStringOption(opt =>
      opt.setName('property').setDescription('Property name').setRequired(false))
    .addStringOption(opt =>
      opt.setName('job').setDescription('Job title').setRequired(false))
    .addStringOption(opt =>
      opt.setName('notes').setDescription('Notes').setRequired(false)),

  new SlashCommandBuilder()
    .setName('clockout')
    .setDescription('Stop the active timer and write the entry')
    .addStringOption(opt =>
      opt.setName('notes').setDescription('Notes').setRequired(false)),

  new SlashCommandBuilder()
    .setName('log')
    .setDescription('Log time after the fact')
    .addNumberOption(opt =>
      opt.setName('minutes').setDescription('Duration in minutes').setRequired(true))
    .addStringOption(opt =>
      opt.setName('category').setDescription('Work category')
        .setRequired(false)
        .addChoices(
          { name: 'Client Work', value: 'client_work' },
          { name: 'Drive Time', value: 'drive_time' },
          { name: 'Prep', value: 'prep' },
          { name: 'Admin', value: 'admin' },
          { name: 'Equipment Maint.', value: 'equipment_maint' },
        ))
    .addStringOption(opt =>
      opt.setName('client').setDescription('Client name').setRequired(false))
    .addStringOption(opt =>
      opt.setName('property').setDescription('Property name').setRequired(false))
    .addStringOption(opt =>
      opt.setName('job').setDescription('Job title').setRequired(false))
    .addStringOption(opt =>
      opt.setName('notes').setDescription('Notes').setRequired(false)),

  new SlashCommandBuilder()
    .setName('task')
    .setDescription('Manage tasks')
    .addSubcommand(sub =>
      sub.setName('add').setDescription('Create a task')
        .addStringOption(opt =>
          opt.setName('title').setDescription('Task title').setRequired(true))
        .addStringOption(opt =>
          opt.setName('priority').setDescription('Priority level')
            .setRequired(false)
            .addChoices(
              { name: 'High', value: 'high' },
              { name: 'Medium', value: 'medium' },
              { name: 'Low', value: 'low' },
            ))
        .addStringOption(opt =>
          opt.setName('client').setDescription('Client name').setRequired(false))
        .addStringOption(opt =>
          opt.setName('property').setDescription('Property name').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('done').setDescription('Mark a task complete')
        .addStringOption(opt =>
          opt.setName('title').setDescription('Task title or partial match').setRequired(true))),

  new SlashCommandBuilder()
    .setName('block')
    .setDescription('Block calendar dates for a property')
    .addStringOption(opt =>
      opt.setName('property').setDescription('Property name').setRequired(true))
    .addStringOption(opt =>
      opt.setName('start').setDescription('Start date (YYYY-MM-DD)').setRequired(true))
    .addStringOption(opt =>
      opt.setName('end').setDescription('End date (YYYY-MM-DD)').setRequired(true))
    .addStringOption(opt =>
      opt.setName('notes').setDescription('Guest name, reason, etc.').setRequired(false)),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Current clock-in status and today\'s summary'),

  new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Trigger Square invoice sync now'),

  new SlashCommandBuilder()
    .setName('debrief')
    .setDescription('End-of-day reflection notes (appends to today by default)')
    .addStringOption(opt =>
      opt.setName('summary').setDescription('Free-form recap of what you did').setRequired(false))
    .addStringOption(opt =>
      opt.setName('wins').setDescription('Wins for the day').setRequired(false))
    .addStringOption(opt =>
      opt.setName('blockers').setDescription('Blockers').setRequired(false))
    .addStringOption(opt =>
      opt.setName('followups').setDescription('Follow-ups for tomorrow').setRequired(false))
    .addStringOption(opt =>
      opt.setName('date').setDescription('YYYY-MM-DD (defaults to today)').setRequired(false))
    .addBooleanOption(opt =>
      opt.setName('replace').setDescription('Overwrite instead of append').setRequired(false)),

  new SlashCommandBuilder()
    .setName('note')
    .setDescription('Add a note to your active timer (or last entry if not clocked in)')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Note to append').setRequired(true)),

  new SlashCommandBuilder()
    .setName('attach')
    .setDescription('Set client/property/job on your active timer or last entry')
    .addStringOption(opt =>
      opt.setName('client').setDescription('Client name').setRequired(false))
    .addStringOption(opt =>
      opt.setName('property').setDescription('Property name').setRequired(false))
    .addStringOption(opt =>
      opt.setName('job').setDescription('Job title').setRequired(false)),
]

/** Map a slash command interaction to an assistant action object */
export function interactionToAction(interaction) {
  const name = interaction.commandName
  const get = (key) => interaction.options.getString(key) || undefined
  const getNum = (key) => interaction.options.getNumber(key) || undefined
  const getBool = (key) => interaction.options.getBoolean(key) ?? undefined

  switch (name) {
    case 'clockin':
      return {
        name: 'clock_in',
        args: {
          category: get('category') || 'client_work',
          client_id: get('client'),
          property_id: get('property'),
          job_id: get('job'),
          notes: get('notes'),
        },
      }

    case 'clockout':
      return {
        name: 'clock_out',
        args: { notes: get('notes') },
      }

    case 'log':
      return {
        name: 'log_time',
        args: {
          minutes: getNum('minutes'),
          category: get('category') || 'client_work',
          client_id: get('client'),
          property_id: get('property'),
          job_id: get('job'),
          notes: get('notes'),
        },
      }

    case 'task': {
      const sub = interaction.options.getSubcommand()
      if (sub === 'add') {
        return {
          name: 'create_task',
          args: {
            title: get('title'),
            priority: get('priority') || 'medium',
            client_id: get('client'),
            property_id: get('property'),
          },
        }
      }
      // sub === 'done'
      return {
        name: 'complete_task',
        args: { task_id: get('title') },
      }
    }

    case 'block':
      return {
        name: 'create_calendar_block',
        args: {
          property_id: get('property'),
          start_date: get('start'),
          end_date: get('end'),
          notes: get('notes'),
        },
      }

    case 'status':
      return { name: 'get_status', args: {} }

    case 'sync':
      return { name: 'trigger_square_sync', args: {} }

    case 'debrief': {
      const replace = getBool('replace')
      return {
        name: 'write_debrief',
        args: {
          summary: get('summary'),
          wins: get('wins'),
          blockers: get('blockers'),
          followups: get('followups'),
          date: get('date'),
          append: replace ? false : true,
        },
      }
    }

    case 'note':
      return {
        name: 'annotate_session',
        args: { notes: get('text') },
      }

    case 'attach':
      return {
        name: 'annotate_session',
        args: {
          client_id: get('client'),
          property_id: get('property'),
          job_id: get('job'),
        },
      }

    default:
      return null
  }
}
