/**
 * Run once to register slash commands with Discord:
 *   node src/register.mjs
 *
 * Requires DISCORD_BOT_TOKEN and DISCORD_APP_ID in .env or environment.
 */
import { REST, Routes } from 'discord.js'
import { commands } from './commands.mjs'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

// Inline .env loader (same as index.mjs)
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

const token = process.env.DISCORD_BOT_TOKEN
const appId = process.env.DISCORD_APP_ID

if (!token || !appId) {
  console.error('DISCORD_BOT_TOKEN and DISCORD_APP_ID are required')
  process.exit(1)
}

const rest = new REST().setToken(token)
const body = commands.map(c => c.toJSON())

console.log(`Registering ${body.length} slash commands...`)
const data = await rest.put(Routes.applicationCommands(appId), { body })
console.log(`Registered ${data.length} commands.`)
