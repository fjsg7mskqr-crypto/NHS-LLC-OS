import type { NextRequest } from 'next/server'
import { createAssistantContext } from '@/lib/assistant/context'
import { runAssistantAction } from '@/lib/assistant/actions'
import type { AssistantActionName, AssistantActor } from '@/lib/assistant/types'
import { isAuthorizedAssistantServiceRequest } from '@/lib/assistant/service-auth'
import { logAssistantEvent } from '@/lib/domain/audit'

type ExecuteAssistantActionRequest = {
  action: {
    name: AssistantActionName
    args?: Record<string, unknown>
  }
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

  const body = await request.json() as ExecuteAssistantActionRequest
  if (!body?.action?.name) {
    return Response.json({ error: 'action.name is required' }, { status: 400 })
  }

  const context = createAssistantContext(body.actor || { surface: 'system' })

  try {
    const action = await runAssistantAction(
      context,
      body.action.name,
      body.action.args || {}
    )

    if (!action.readOnly) {
      await logAssistantEvent(context.supabase, {
        actor: context.actor,
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
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Assistant action failed' },
      { status: 400 }
    )
  }
}
