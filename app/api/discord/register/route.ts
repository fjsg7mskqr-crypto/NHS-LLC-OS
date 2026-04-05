import { getAuthenticatedUserFromCookies } from '@/lib/auth'
import { getDiscordApplicationCommands } from '@/lib/discord/commands'

export const runtime = 'nodejs'

function requireDiscordEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

export async function POST() {
  const user = await getAuthenticatedUserFromCookies()
  if (!user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const token = requireDiscordEnv('DISCORD_BOT_TOKEN')
    const applicationId = requireDiscordEnv('DISCORD_APPLICATION_ID')
    const guildId = requireDiscordEnv('DISCORD_GUILD_ID')

    const response = await fetch(
      `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(getDiscordApplicationCommands()),
      }
    )

    const payload = await response.json()
    if (!response.ok) {
      return Response.json(
        { error: payload?.message || 'Failed to register Discord commands', details: payload },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      commands: payload,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to register Discord commands' },
      { status: 500 }
    )
  }
}
