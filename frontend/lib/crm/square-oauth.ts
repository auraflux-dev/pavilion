import { createHmac } from 'node:crypto'
import { getConnector, putConnector, type SquareConnectorSecret } from '@/lib/crm/connectors'
import { markSyncError, markSyncOk } from '@/lib/crm/sync-state'

const SQUARE_AUTH = 'https://connect.squareup.com/oauth2'
const SQUARE_TOKEN = 'https://connect.squareup.com/oauth2/token'

export function squareOAuthConfigured(): boolean {
  return Boolean(
    process.env.SQUARE_APPLICATION_ID?.trim() && process.env.SQUARE_APPLICATION_SECRET?.trim(),
  )
}

export function squareOAuthRedirectUri(): string {
  return (
    process.env.SQUARE_OAUTH_REDIRECT_URI?.trim() ||
    `${(process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')}/api/commons/square/oauth/callback`
  )
}

export const SQUARE_OAUTH_SCOPES = [
  'MERCHANT_PROFILE_READ',
  'PAYMENTS_READ',
  'GIFTCARDS_READ',
  'GIFTCARDS_WRITE',
].join(' ')

export function squareAuthorizeUrl(state: string): string {
  const id = process.env.SQUARE_APPLICATION_ID!.trim()
  const params = new URLSearchParams({
    client_id: id,
    scope: SQUARE_OAUTH_SCOPES,
    session: 'false',
    state,
    redirect_uri: squareOAuthRedirectUri(),
  })
  return `${SQUARE_AUTH}/authorize?${params.toString()}`
}

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_at?: string
  merchant_id?: string
}

export async function exchangeSquareCode(code: string): Promise<SquareConnectorSecret> {
  const res = await fetch(SQUARE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APPLICATION_ID!.trim(),
      client_secret: process.env.SQUARE_APPLICATION_SECRET!.trim(),
      grant_type: 'authorization_code',
      code,
      redirect_uri: squareOAuthRedirectUri(),
    }),
  })
  const json = (await res.json()) as TokenResponse
  if (!res.ok || !json.access_token || !json.refresh_token || !json.merchant_id) {
    throw new Error('Square OAuth token exchange failed')
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    merchantId: json.merchant_id,
    expiresAt: json.expires_at || null,
  }
}

export async function refreshSquareToken(orgId: string): Promise<void> {
  const secret = await getConnector<SquareConnectorSecret>(orgId, 'square')
  if (!secret?.refreshToken) throw new Error('No Square refresh token')
  const res = await fetch(SQUARE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APPLICATION_ID!.trim(),
      client_secret: process.env.SQUARE_APPLICATION_SECRET!.trim(),
      grant_type: 'refresh_token',
      refresh_token: secret.refreshToken,
    }),
  })
  const json = (await res.json()) as TokenResponse
  if (!res.ok || !json.access_token) {
    await markSyncError(orgId, 'square', 'Square token refresh failed')
    throw new Error('Square token refresh failed')
  }
  const next: SquareConnectorSecret = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || secret.refreshToken,
    merchantId: json.merchant_id || secret.merchantId,
    expiresAt: json.expires_at || null,
  }
  await putConnector(orgId, 'square', next, {
    merchantId: next.merchantId,
    expiresAt: next.expiresAt,
  })
  await markSyncOk(orgId, 'square')
}

export function verifySquareWebhook(opts: {
  signature: string
  body: string
  notificationUrl: string
  signatureKey: string
}): boolean {
  if (!opts.signatureKey || !opts.signature) return false
  const hmac = createHmac('sha256', opts.signatureKey)
  hmac.update(opts.notificationUrl + opts.body)
  return hmac.digest('base64') === opts.signature
}
