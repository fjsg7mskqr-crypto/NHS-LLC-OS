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
      supabase: context.supabase,
    })

    if (chosen.type === 'message') {
      return Response.json({
        reply: chosen.message,
        needsClarification: true,
      } satisfies AssistantResponse)
    }

    // Normalize single/multi into an array
    const actionList = chosen.type === 'actions'
      ? chosen.actions
      : [{ name: chosen.name, args: chosen.args }]

    const replies: string[] = []
    const results: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = []

    for (const item of actionList) {
      try {
        const action = await runAssistantAction(context, item.name, item.args)
        replies.push(action.reply)
        results.push({ name: action.name, args: action.args, result: action.result })

        if (!action.readOnly) {
          await logAssistantEvent(context.supabase, {
            actor,
            actionName: action.name,
            args: action.args,
            result: action.result,
          })
        }
      } catch (err) {
        replies.push(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return Response.json({
      reply: replies.join('\n'),
      action: results[0] ? {
        name: results[0].name as AssistantResponse['action'] extends { name: infer N } ? N : never,
        args: results[0].args,
        result: results.length === 1 ? results[0].result : results.map(r => r.result),
      } : undefined,
    } satisfies AssistantResponse)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Assistant parse failed' },
      { status: 400 }
    )
  }
}
