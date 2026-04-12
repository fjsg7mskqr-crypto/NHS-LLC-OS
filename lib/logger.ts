/**
 * Structured error logger for API routes.
 *
 * Vercel captures console output in its log drain. This produces
 * JSON-structured log lines so they're filterable in the Vercel dashboard.
 *
 * To upgrade to Sentry later, replace the body of `captureError` with
 * Sentry.captureException() and add Sentry.init() in instrumentation.ts.
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

  console.warn(JSON.stringify(entry))
}
