import { createHash, randomBytes } from 'node:crypto'
import {
  CANVA_AUTH_URL,
  CANVA_SCOPES,
  CANVA_TOKEN_URL,
  canvaClientConfigured,
} from '@/lib/canva/config'

function clientId() {
  return process.env.CANVA_CLIENT_ID?.trim() || ''
}
function clientSecret() {
  return process.env.CANVA_CLIENT_SECRET?.trim() || ''
}

export function makePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(64).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function makeOAuthState(): string {
  return randomBytes(32).toString('base64url')
}

export function buildCanvaAuthorizeUrl(opts: {
  redirectUri: string
  challenge: string
  state: string
}): string {
  if (!canvaClientConfigured()) {
    throw new Error('CANVA_CLIENT_ID / CANVA_CLIENT_SECRET not configured')
  }
  const url = new URL(CANVA_AUTH_URL)
  url.searchParams.set('code_challenge', opts.challenge)
  url.searchParams.set('code_challenge_method', 's256')
  url.searchParams.set('scope', CANVA_SCOPES)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId())
  url.searchParams.set('state', opts.state)
  url.searchParams.set('redirect_uri', opts.redirectUri)
  return url.toString()
}

export type CanvaTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
}

function basicAuthHeader(): string {
  return `Basic ${Buffer.from(`${clientId()}:${clientSecret()}`).toString('base64')}`
}

export async function exchangeAuthorizationCode(opts: {
  code: string
  codeVerifier: string
  redirectUri: string
}): Promise<CanvaTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: opts.code,
    code_verifier: opts.codeVerifier,
    redirect_uri: opts.redirectUri,
  })
  const res = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const data = (await res.json().catch(() => ({}))) as CanvaTokenResponse & {
    error?: string
    message?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.message || data.error || `Canva token exchange failed (${res.status})`)
  }
  return data
}

export async function refreshCanvaAccessToken(refreshToken: string): Promise<CanvaTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  const res = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const data = (await res.json().catch(() => ({}))) as CanvaTokenResponse & {
    error?: string
    message?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.message || data.error || `Canva refresh failed (${res.status})`)
  }
  return data
}
