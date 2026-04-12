import type { NextRequest } from 'next/server'
import { createAssistantContext } from '@/lib/assistant/context'
import { runAssistantAction } from '@/lib/assistant/actions'
import { logAssistantEvent } from '@/lib/domain/audit'
import { mapDiscordInteractionToAction } from '@/lib/discord/commands'
import { verifyDiscordRequest } from '@/lib/discord/verify'
import { captureError } from '@/lib/logger'

export const runtime = 'nodejs'

const INTERACTION_TYPE_PING = 1
const INTERACTION_TYPE_APPLICATION_COMMAND = 2
const CALLBACK_TYPE_PONG = 1
const CALLBACK_TYPE_CHANNEL_MESSAGE = 4
const CALLBACK_TYPE_DEFERRED = 5
const EPHEMERAL_FLAG = 1 << 6

const SLOW_COMMANDS = new Set(['trigger_square_sync'])

function interactionUserId(interaction: {
  member?: { user?: { id: string; username?: string } }
  user?: { id: string; username?: string }
}) {
  return interaction.member?.user?.id || interaction.user?.id || null
}

function interactionUsername(interaction: {
  member?: { user?: { id: string; username?: string } }
  user?: { id: string; username?: string }
}) {
  return interaction.member?.user?.username || interaction.user?.username || null
}

function discordMessage(content: string, ephemeral = true) {
  return Response.json({
    type: CALLBACK_TYPE_CHANNEL_MESSAGE,
    data: {
      content,
      flags: ephemeral ? EPHEMERAL_FLAG : 0,
    },
  })
}

async function logDiscordEvent(
  supabase: ReturnType<typeof createAssistantContext>['supabase'],
  interaction: Record<string, unknown>
) {
  const { error } = await supabase.from('discord_events').insert({
    discord_user_id: interactionUserId(interaction as never),
    discord_channel_id:
      typeof interaction.channel_id === 'string' ? interaction.channel_id : null,
    command_name:
      typeof (interaction.data as { name?: string } | undefined)?.name === 'string'
        ? (interaction.data as { name: string }).name
        : null,
    interaction_type:
      typeof interaction.type === 'number' ? interaction.type : 0,
    payload: interaction,
  })

  if (error && !error.message.toLowerCase().includes('relation')) {
    throw new Error(error.message)
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature-ed25519')
  const timestamp = request.headers.get('x-signature-timestamp')

  if (!signature || !timestamp) {
    return Response.json({ error: 'Missing Discord signature headers' }, { status: 401 })
  }

  try {
    if (!verifyDiscordRequest(signature, timestamp, rawBody)) {
      return Response.json({ error: 'Invalid request signature' }, { status: 401 })
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Discord verification failed' },
      { status: 500 }
    )
  }

  const interaction = JSON.parse(rawBody) as {
    type: number
    channel_id?: string
    member?: { user?: { id: string; username?: string } }
    user?: { id: string; username?: string }
    data?: { name: string }
  }

  if (interaction.type === INTERACTION_TYPE_PING) {
    return Response.json({ type: CALLBACK_TYPE_PONG })
  }

  const userId = interactionUserId(interaction)
  const username = interactionUsername(interaction)

  if (!process.env.DISCORD_USER_ID) {
    return discordMessage('DISCORD_USER_ID is not configured.')
  }

  if (userId !== process.env.DISCORD_USER_ID) {
    return discordMessage('You are not authorized to use this bot.')
  }

  if (
    process.env.DISCORD_CHANNEL_ID &&
    interaction.channel_id &&
    interaction.channel_id !== process.env.DISCORD_CHANNEL_ID
  ) {
    return discordMessage('This bot only accepts commands in the configured channel.')
  }

  if (interaction.type !== INTERACTION_TYPE_APPLICATION_COMMAND) {
    return discordMessage('Unsupported Discord interaction type.')
  }

  const context = createAssistantContext({
    surface: 'discord',
    discordUserId: userId,
    githubLogin: username,
  })

  // Non-blocking audit log — don't let it block commands
  logDiscordEvent(context.supabase, interaction as unknown as Record<string, unknown>).catch(() => {})

  const mapped = await mapDiscordInteractionToAction(interaction, context)
  if (mapped.type === 'error') {
    return discordMessage(mapped.message)
  }

  // For slow commands, defer the response and follow up via webhook
  if (SLOW_COMMANDS.has(mapped.name)) {
    const interactionToken = (interaction as { token?: string }).token
    const appId = process.env.DISCORD_APPLICATION_ID

    if (interactionToken && appId) {
      // Fire and forget — run the action after deferring
      const ctx = context
      const m = mapped
      void (async () => {
        try {
          const action = await runAssistantAction(ctx, m.name, m.args)
          await fetch(`https://discord.com/api/v10/webhooks/${appId}/${interactionToken}/messages/@original`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: action.reply }),
          })
        } catch (err) {
          await fetch(`https://discord.com/api/v10/webhooks/${appId}/${interactionToken}/messages/@original`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: err instanceof Error ? err.message : 'Command failed' }),
          }).catch(() => {})
        }
      })()

      return Response.json({
        type: CALLBACK_TYPE_DEFERRED,
        data: { flags: EPHEMERAL_FLAG },
      })
    }
  }

  try {
    const action = await runAssistantAction(context, mapped.name, mapped.args)

    if (!action.readOnly) {
      await logAssistantEvent(context.supabase, {
        actor: context.actor,
        actionName: action.name,
        args: action.args,
        result: action.result,
      })
    }

    return discordMessage(action.reply)
  } catch (error) {
    captureError(error, { route: '/api/discord/interactions', method: 'POST' })
    return discordMessage(
      error instanceof Error ? error.message : 'Discord command failed'
    )
  }
}
