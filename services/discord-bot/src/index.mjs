import { Client, Events, GatewayIntentBits, InteractionType } from 'discord.js'
import { interactionToAction } from './commands.mjs'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return

  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

loadDotEnv()

const required = [
  'DISCORD_BOT_TOKEN',
  'DISCORD_CHANNEL_ID',
  'DISCORD_USER_ID',
  'ASSISTANT_BASE_URL',
  'ASSISTANT_SERVICE_TOKEN',
]

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`${key} is required`)
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
})

async function executeAssistantAction(action) {
  const response = await fetch(`${process.env.ASSISTANT_BASE_URL}/api/assistant/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.ASSISTANT_SERVICE_TOKEN}`,
    },
    body: JSON.stringify({
      actor: {
        surface: 'discord',
        discordUserId: process.env.DISCORD_USER_ID,
      },
      action,
    }),
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.error || 'Assistant execution failed')
  }

  return payload
}

async function parsePlainTextMessage(content) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55000)

  try {
    const response = await fetch(`${process.env.ASSISTANT_BASE_URL}/api/assistant/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ASSISTANT_SERVICE_TOKEN}`,
      },
      body: JSON.stringify({
        actor: {
          surface: 'discord',
          discordUserId: process.env.DISCORD_USER_ID,
        },
        message: content,
      }),
      signal: controller.signal,
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload?.error || 'Assistant parse failed')
    }

    return payload
  } finally {
    clearTimeout(timeout)
  }
}

client.once(Events.ClientReady, readyClient => {
  console.log(`Discord worker logged in as ${readyClient.user.tag}`)
})

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return
  if (message.author.id !== process.env.DISCORD_USER_ID) return
  if (message.channelId !== process.env.DISCORD_CHANNEL_ID) return

  try {
    const result = await parsePlainTextMessage(message.content)
    await message.reply(result.reply || 'Done (no reply text)')
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Discord worker failed'
    console.error('Bot error:', msg)
    if (error?.name === 'AbortError') {
      await message.reply('Request timed out — try shorter messages or split into separate entries.')
    } else {
      await message.reply(msg)
    }
  }
})

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.type !== InteractionType.ApplicationCommand) return
  if (interaction.user.id !== process.env.DISCORD_USER_ID) {
    await interaction.reply({ content: 'Not authorized.', ephemeral: true })
    return
  }

  const action = interactionToAction(interaction)
  if (!action) {
    await interaction.reply({ content: 'Unknown command.', ephemeral: true })
    return
  }

  await interaction.deferReply()

  try {
    const result = await executeAssistantAction(action)
    await interaction.editReply(result.reply || 'Done.')
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Slash command failed'
    console.error('Slash command error:', msg)
    await interaction.editReply(msg)
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)

export { executeAssistantAction, parsePlainTextMessage }
