import type { SupabaseClient } from '@supabase/supabase-js'
import type { AssistantActor, AssistantActionName } from '@/lib/assistant/types'

export async function logAssistantEvent(
  supabase: SupabaseClient,
  input: {
    actor: AssistantActor
    actionName: AssistantActionName
    args: Record<string, unknown>
    result: unknown
    success?: boolean
  }
) {
  const { error } = await supabase
    .from('assistant_events')
    .insert({
      surface: input.actor.surface,
      actor_user_id: input.actor.userId || null,
      actor_email: input.actor.email || null,
      actor_github_login: input.actor.githubLogin || null,
      actor_discord_user_id: input.actor.discordUserId || null,
      action_name: input.actionName,
      action_args: input.args,
      action_result: input.result,
      success: input.success ?? true,
    })

  if (error) {
    if (error.message.toLowerCase().includes('relation')) {
      return
    }
    throw new Error(error.message)
  }
}
