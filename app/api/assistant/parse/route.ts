import type { NextRequest } from 'next/server'
import { createAssistantContext } from '@/lib/assistant/context'
import { runAssistantAction } from '@/lib/assistant/actions'
import { isAuthorizedAssistantServiceRequest } from '@/lib/assistant/service-auth'
import { chooseAssistantActionWithOpenAI } from '@/lib/assistant/openai-parse'
import { logAssistantEvent } from '@/lib/domain/audit'
import type { AssistantActor, AssistantResponse } from '@/lib/assistant/types'

type ParseAssistantRequest = {
  message: string
  actor?: AssistantActor
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAssistantServiceRequest(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Service token error' },
      { status: 500 }
    )
  }

  const body = await request.json() as ParseAssistantRequest
  if (!body?.message?.trim()) {
    return Response.json({ error: 'message is required' }, { status: 400 })
  }

  const actor = body.actor || { surface: 'system' }
  const context = createAssistantContext(actor)

  try {
    const chosen = await chooseAssistantActionWithOpenAI({
      message: body.message,
      actor,
      timezone: context.timezone,
    })

    if (chosen.type === 'message') {
      return Response.json({
        reply: chosen.message,
        needsClarification: true,
      } satisfies AssistantResponse)
    }

    const action = await runAssistantAction(context, chosen.name, chosen.args)

    if (!action.readOnly) {
      await logAssistantEvent(context.supabase, {
        actor,
        actionName: action.name,
        args: action.args,
        result: action.result,
      })
    }

    return Response.json({
      reply: action.reply,
      action: {
        name: action.name,
        args: action.args,
        result: action.result,
      },
    } satisfies AssistantResponse)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Assistant parse failed' },
      { status: 400 }
    )
  }
}
