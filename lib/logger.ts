import * as Sentry from '@sentry/nextjs'

/**
 * Structured error logger for API routes.
 *
 * Errors and warnings are sent to Sentry and also emitted as structured
 * console lines so they remain easy to inspect in Vercel logs.
 */

type LogContext = {
  route?: string
  method?: string
  ip?: string
  userId?: string
  [key: string]: unknown
}

export function captureError(error: unknown, context?: LogContext) {
  const entry = {
    level: 'error',
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  }

  Sentry.captureException(error, {
    extra: context,
  })

  // Structured JSON line — Vercel log drain picks this up
  console.error(JSON.stringify(entry))
}

export function captureWarning(message: string, context?: LogContext) {
  const entry = {
    level: 'warn',
    timestamp: new Date().toISOString(),
    message,
    ...context,
  }

  Sentry.captureMessage(message, {
    level: 'warning',
    extra: context,
  })

  console.warn(JSON.stringify(entry))
}
