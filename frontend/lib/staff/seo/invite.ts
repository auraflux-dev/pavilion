import { createHmac, timingSafeEqual } from 'crypto'

export type SeoConnectInvitePayload = {
  v: 1
  workspaceId: string
  tools: Array<'gsc' | 'ga4'>
  googleHd: string | null
  allowedGoogleEmails: string[]
  exp: number
}

function inviteSecret() {
  const explicit = process.env.ACCOUNT_SESSION_SECRET?.trim()
  if (explicit) return `seo-invite:${explicit}`
  return 'seo-invite:dev-only-not-for-prod'
}

function signBody(body: string) {
  return createHmac('sha256', inviteSecret()).update(body).digest('base64url')
}

function encode<T extends object>(payload: T): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${body}.${signBody(body)}`
}

function decode<T extends object>(raw: string): T | null {
  const [body, sig] = raw.split('.')
  if (!body || !sig) return null
  const expected = signBody(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

export function createSeoConnectInvite(opts: {
  workspaceId: string
  origin: string
  tools?: Array<'gsc' | 'ga4'>
  googleHd?: string | null
  allowedGoogleEmails?: string[]
  ttlHours?: number
}): { token: string; url: string; payload: SeoConnectInvitePayload } {
  const payload: SeoConnectInvitePayload = {
    v: 1,
    workspaceId: opts.workspaceId,
    tools: opts.tools?.length ? opts.tools : ['gsc'],
    googleHd: opts.googleHd ?? null,
    allowedGoogleEmails: opts.allowedGoogleEmails || [],
    exp: Date.now() + (opts.ttlHours ?? 72) * 60 * 60 * 1000,
  }
  const token = encode(payload)
  const url = `${opts.origin.replace(/\/$/, '')}/seo-connect?token=${encodeURIComponent(token)}`
  return { token, url, payload }
}

export function verifySeoConnectInvite(token: string): SeoConnectInvitePayload | null {
  const payload = decode<SeoConnectInvitePayload>(token)
  if (!payload || payload.v !== 1 || !payload.workspaceId) return null
  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
  if (!Array.isArray(payload.tools) || payload.tools.length === 0) return null
  return payload
}
