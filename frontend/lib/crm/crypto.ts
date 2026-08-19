import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

function kek(): Buffer {
  const raw = process.env.CONNECTOR_KEK?.trim() || process.env.BACKUP_ENCRYPTION_KEY?.trim()
  if (raw) {
    try {
      const fromB64 = Buffer.from(raw, 'base64')
      if (fromB64.length === 32) return fromB64
    } catch {
      // fall through
    }
    if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex')
  }
  const secret = process.env.BETTER_AUTH_SECRET || process.env.DEMO_SIGNING_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('CONNECTOR_KEK (32-byte base64) is required to store tenant secrets')
  }
  return createHash('sha256').update(`commons-connector-kek:${secret}`).digest()
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', kek(), iv)
  const plain = Buffer.from(JSON.stringify(value), 'utf8')
  const enc = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decryptJson<T>(ciphertext: string): T {
  const buf = Buffer.from(ciphertext, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const enc = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', kek(), iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(enc), decipher.final()])
  return JSON.parse(plain.toString('utf8')) as T
}
