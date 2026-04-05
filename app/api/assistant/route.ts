import type { NextRequest } from 'next/server'
import { applySessionCookies, requireAuthenticatedRequest } from '@/lib/auth'
import { createAssistantContext } from '@/lib/assistant/context'
import { parseAssistantRequest } from '@/lib/assistant/parser'
import { runAssistantAction } from '@/lib/assistant/actions'
import type { AssistantRequest, AssistantResponse } from '@/lib/assistant/types'
import { logAssistantEvent } from '@/lib/domain/audit'

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request)
  if ('response' in auth) {
    return auth.response
  }

  const body = await request.json() as AssistantRequest
  if (!body?.message || typeof body.message !== 'string') {
    return Response.json({ error: 'message is required' }, { status: 400 })
  }

  const context = createAssistantContext({
    surface: 'app',
    userId: auth.user.id,
    email: auth.user.email ?? null,
    githubLogin:
      auth.user.user_metadata?.user_name ??
      auth.user.user_metadata?.preferred_username ??
      null,
  })

  const parsed = parseAssistantRequest(body)

  if (parsed.type === 'clarify') {
    const response = Response.json({
      reply: parsed.question,
      needsClarification: true,
    } satisfies AssistantResponse)
    if (auth.refreshedSession) {
      applySessionCookies(response, auth.refreshedSession)
    }
    return response
  }

  if (parsed.type === 'unsupported') {
    const response = Response.json({
      reply: parsed.message,
    } satisfies AssistantResponse)
    if (auth.refreshedSession) {
      applySessionCookies(response, auth.refreshedSession)
    }
    return response
  }

  try {
    const action = await runAssistantAction(context, parsed.name, parsed.args)

    if (!action.readOnly) {
      await logAssistantEvent(context.supabase, {
        actor: context.actor,
        actionName: action.name,
        args: action.args,
        result: action.result,
      })
    }

    const response = Response.json({
      reply: action.reply,
      action: {
        name: action.name,
        args: action.args,
        result: action.result,
      },
    } satisfies AssistantResponse)
    if (auth.refreshedSession) {
      applySessionCookies(response, auth.refreshedSession)
    }
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assistant request failed'
    const response = Response.json({ error: message }, { status: 400 })
    if (auth.refreshedSession) {
      applySessionCookies(response, auth.refreshedSession)
    }
    return response
  }
}
