/**
 * Google (and similar) OAuth cannot register every ephemeral Vercel Preview URL.
 * Preview hosts bounce to www for Google, then return here with a short-lived
 * signed handoff so the session cookie lands on the Preview host.
 */
import { createHmac, timingSafeEqual } from 'crypto'
import type { Tokens } from '@wix/sdk'

const HANDOFF_TTL_MS = 60_000

export type PreviewHandoffPayload = {
  v: 1
  exp: number
  returnTo: string
  tokens: Tokens
}

function handoffSecret(): string {
  return (
    process.env.WIX_API_KEY?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ||
    ''
  )
}

/** Only our Vercel Preview project hosts (blocks open redirects). */
export function isAllowedPreviewOrigin(origin: string): boolean {
  try {
    const u = new URL(origin)
    if (u.protocol !== 'https:') return false
    if (u.pathname !== '/' && u.pathname !== '') return false
    if (u.search || u.hash) return false
    const host = u.hostname.toLowerCase()
    return (
      host.endsWith('-treasurer-4353s-projects.vercel.app') ||
      host === 'shmspto.vercel.app'
    )
  } catch {
    return false
  }
}

export function requestOriginFromHost(hostHeader: string | null): string {
  const host = (hostHeader || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .split(':')[0]
  if (!host) return ''
  if (host.includes('localhost') || host.startsWith('127.0.0.1')) {
    return `http://${host}`
  }
  return `https://${host}`
}

/** Ephemeral Preview URL that is not a registered Google redirect host. */
export function isEphemeralVercelPreviewHost(hostHeader: string | null): boolean {
  const host = (hostHeader || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .split(':')[0]
  if (!host.endsWith('.vercel.app')) return false
  if (host === 'shmspto.vercel.app') return false
  return host.endsWith('-treasurer-4353s-projects.vercel.app')
}

function signBody(body: string): string {
  const secret = handoffSecret()
  if (!secret) throw new Error('handoff_secret_missing')
  return createHmac('sha256', secret).update(body).digest('base64url')
}

export function mintPreviewHandoff(opts: {
  tokens: Tokens
  returnTo: string
}): string {
  const payload: PreviewHandoffPayload = {
    v: 1,
    exp: Date.now() + HANDOFF_TTL_MS,
    returnTo: opts.returnTo,
    tokens: opts.tokens,
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${body}.${signBody(body)}`
}

export function verifyPreviewHandoff(
  raw: string,
): PreviewHandoffPayload | null {
  const secret = handoffSecret()
  if (!secret) return null
  const dot = raw.lastIndexOf('.')
  if (dot <= 0) return null
  const body = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  const expected = signBody(body)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as PreviewHandoffPayload
    if (parsed?.v !== 1 || !parsed.exp || parsed.exp < Date.now()) return null
    if (!parsed.tokens?.accessToken?.value || !parsed.tokens?.refreshToken?.value) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
