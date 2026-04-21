import { Client, Events, GatewayIntentBits, InteractionType } from 'discord.js'
import { interactionToAction } from './commands.mjs'
import fs from 'node:fs'
import http from 'node:http'
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

// Daily morning brief — fetches today's plan from the Next.js API and
// posts it to the channel at a configured hour in the configured timezone.
// Defaults to 7:00 America/Detroit. No external cron dep; we compute the
// ms until next fire, setTimeout, then re-schedule after each fire.
const BRIEF_HOUR = Number(process.env.DAILY_BRIEF_HOUR ?? 7)
const BRIEF_MINUTE = Number(process.env.DAILY_BRIEF_MINUTE ?? 0)
const BRIEF_TZ = process.env.DAILY_BRIEF_TZ || 'America/Detroit'

function msUntilNextBriefTime() {
  const now = new Date()
  const localParts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRIEF_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const get = type => Number(localParts.find(p => p.type === type)?.value || 0)
  const localY = get('year')
  const localM = get('month')
  const localD = get('day')
  const localH = get('hour') === 24 ? 0 : get('hour')
  const localMin = get('minute')

  // Find today's fire time in the configured tz. If it has already passed,
  // roll to tomorrow.
  const nowLocalMinutes = localH * 60 + localMin
  const targetMinutes = BRIEF_HOUR * 60 + BRIEF_MINUTE
  let dayOffset = 0
  if (nowLocalMinutes >= targetMinutes) dayOffset = 1

  // Build a Date representing target-local-time by constructing an ISO in the
  // user's tz and converting to UTC via known offset.
  const offsetStr = (() => {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: BRIEF_TZ,
      timeZoneName: 'shortOffset',
    })
    const tzName = fmt.formatToParts(now).find(p => p.type === 'timeZoneName')?.value || 'GMT+0'
    const m = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
    if (!m) return '+00:00'
    return `${m[1]}${m[2].padStart(2, '0')}:${(m[3] || '00').padStart(2, '0')}`
  })()

  const targetY = localY
  const targetM = localM
  const targetD = localD + dayOffset
  const iso = `${targetY}-${String(targetM).padStart(2, '0')}-${String(targetD).padStart(2, '0')}T${String(BRIEF_HOUR).padStart(2, '0')}:${String(BRIEF_MINUTE).padStart(2, '0')}:00${offsetStr}`
  const target = new Date(iso)
  return Math.max(1000, target.getTime() - now.getTime())
}

async function postMorningBrief() {
  try {
    const res = await fetch(`${process.env.ASSISTANT_BASE_URL}/api/assistant/morning-brief`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ASSISTANT_SERVICE_TOKEN}`,
      },
    })
    const payload = await res.json()
    if (!res.ok) throw new Error(payload?.error || 'brief failed')
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID)
    if (channel && channel.isTextBased?.() && channel.send) {
      await channel.send(payload.message || 'Morning brief had no content.')
    }
  } catch (err) {
    console.error('Morning brief error:', err?.message || err)
  }
}

function scheduleNextBrief() {
  const delay = msUntilNextBriefTime()
  const nextFire = new Date(Date.now() + delay).toLocaleString('en-US', { timeZone: BRIEF_TZ })
  console.log(`Next morning brief scheduled for ${nextFire} (${BRIEF_TZ}) in ${Math.round(delay / 60000)} min`)
  setTimeout(async () => {
    await postMorningBrief()
    scheduleNextBrief()
  }, delay)
}

client.once(Events.ClientReady, () => {
  scheduleNextBrief()
})

// Railway healthcheck keepalive — bind $PORT so the container is not killed
// for failing to listen on a port. The bot itself is a Discord gateway worker
// and has no HTTP surface, but Railway's default healthcheck expects one.
const port = Number(process.env.PORT) || 3000
http
  .createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(client.isReady() ? 'ok' : 'starting')
  })
  .listen(port, () => {
    console.log(`Healthcheck server listening on :${port}`)
  })

client.login(process.env.DISCORD_BOT_TOKEN)

export { executeAssistantAction, parsePlainTextMessage }
