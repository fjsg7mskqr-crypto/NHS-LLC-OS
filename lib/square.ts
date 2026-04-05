import { SquareClient, SquareEnvironment } from 'square'

export function createSquareClient() {
  const token = process.env.SQUARE_ACCESS_TOKEN
  if (!token) {
    throw new Error('SQUARE_ACCESS_TOKEN is not configured')
  }

  return new SquareClient({
    token,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  })
}
