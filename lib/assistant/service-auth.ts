import type { NextRequest } from 'next/server'

export function getAssistantServiceToken() {
  const token = process.env.ASSISTANT_SERVICE_TOKEN
  if (!token) {
    throw new Error('ASSISTANT_SERVICE_TOKEN is not configured')
  }
  return token
}

export function isAuthorizedAssistantServiceRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const provided = authHeader.slice('Bearer '.length)
  return provided === getAssistantServiceToken()
}
