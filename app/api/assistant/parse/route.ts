import type { NextRequest } from 'next/server'
import { after } from 'next/server'
import { createAssistantContext } from '@/lib/assistant/context'
import { runAssistantAction } from '@/lib/assistant/actions'
import { isAuthorizedAssistantServiceRequest } from '@/lib/assistant/service-auth'
import { chooseAssistantActionWithOpenAI, synthesizeChatReply } from '@/lib/assistant/openai-parse'
import { logAssistantEvent } from '@/lib/domain/audit'
import type { AssistantActor, AssistantResponse } from '@/lib/assistant/types'
import { captureError } from '@/lib/logger'

export const maxDuration = 60

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
    let allReadOnly = true
    let anySucceeded = false

    for (const item of actionList) {
      try {
        const action = await runAssistantAction(context, item.name, item.args)
        replies.push(action.reply)
        results.push({ name: action.name, args: action.args, result: action.result })
        anySucceeded = true
        if (!action.readOnly) allReadOnly = false

        if (!action.readOnly) {
          after(async () => {
            try {
              await logAssistantEvent(context.supabase, {
                actor,
                actionName: action.name,
                args: action.args,
                result: action.result,
              })
            } catch (logErr) {
              captureError(logErr, { route: '/api/assistant/parse', stage: 'audit-log' })
            }
          })
        }
      } catch (err) {
        replies.push(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        allReadOnly = false
      }
    }

    // Chat-mode path: if every action succeeded and was read-only, synthesize
    // a conversational answer from the results instead of dumping the raw reply.
    let finalReply = replies.join('\n')
    if (anySucceeded && allReadOnly && results.length > 0) {
      try {
        finalReply = await synthesizeChatReply({
          userMessage: body.message,
          toolResults: results.map(r => ({ name: r.name, result: r.result })),
          timezone: context.timezone,
        })
      } catch (synthErr) {
        captureError(synthErr, { route: '/api/assistant/parse', stage: 'synthesize' })
        // fall back to joined raw replies
      }
    }

    return Response.json({
      reply: finalReply,
      action: results[0] ? {
        name: results[0].name as AssistantResponse['action'] extends { name: infer N } ? N : never,
        args: results[0].args,
        result: results.length === 1 ? results[0].result : results.map(r => r.result),
      } : undefined,
    } satisfies AssistantResponse)
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    captureError(error, { route: '/api/assistant/parse', method: 'POST' })
    return Response.json(
      { error: isAbort ? 'OpenAI request timed out — try a shorter message' : (error instanceof Error ? error.message : 'Assistant parse failed') },
      { status: isAbort ? 504 : 400 }
    )
  }
}
