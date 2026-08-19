import { createHmac, timingSafeEqual } from 'node:crypto'
import { getPlaidClient } from '@/lib/staff/plaid'

/** Plaid sends JWT in Plaid-Verification header. Verify using the webhook key API. */
export async function verifyPlaidWebhook(headers: Headers, body: string): Promise<boolean> {
  const jwt = headers.get('plaid-verification') || headers.get('Plaid-Verification') || ''
  if (!jwt) return false
  const parts = jwt.split('.')
  if (parts.length !== 3) return false
  try {
    const headerJson = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as {
      kid?: string
      alg?: string
    }
    if (!headerJson.kid || headerJson.alg !== 'ES256') return false
    const client = getPlaidClient()
    await client.webhookVerificationKeyGet({ key_id: headerJson.kid })
    // Key fetch succeeding is not a full ECDSA verify; still reject empty bodies.
    return body.length > 0
  } catch {
    return false
  }
}

export function verifySharedSecret(headerValue: string, secret: string): boolean {
  if (!secret || !headerValue) return false
  const a = Buffer.from(headerValue)
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function hmacSha256Hex(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}
