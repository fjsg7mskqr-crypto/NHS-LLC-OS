import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'
import type { AssistantActor } from './types'

export type AssistantContext = {
  supabase: SupabaseClient
  actor: AssistantActor
  timezone: string
  now: Date
}

export function createAssistantContext(actor: AssistantActor): AssistantContext {
  return {
    supabase: createServerClient(),
    actor,
    timezone: 'America/Detroit',
    now: new Date(),
  }
}
