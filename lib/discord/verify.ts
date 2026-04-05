import { createPublicKey, verify } from 'node:crypto'

const ED25519_SPKI_PREFIX = '302a300506032b6570032100'

let cachedKey: ReturnType<typeof createPublicKey> | null = null

function getDiscordPublicKey() {
  const publicKey = process.env.DISCORD_PUBLIC_KEY
  if (!publicKey) {
    throw new Error('DISCORD_PUBLIC_KEY is not configured')
  }
  return publicKey
}

function getKeyObject() {
  if (cachedKey) return cachedKey
  const raw = Buffer.from(getDiscordPublicKey(), 'hex')
  cachedKey = createPublicKey({
    key: Buffer.concat([Buffer.from(ED25519_SPKI_PREFIX, 'hex'), raw]),
    format: 'der',
    type: 'spki',
  })
  return cachedKey
}

export function verifyDiscordRequest(signature: string, timestamp: string, rawBody: string) {
  const key = getKeyObject()
  return verify(null, Buffer.from(timestamp + rawBody), key, Buffer.from(signature, 'hex'))
}
