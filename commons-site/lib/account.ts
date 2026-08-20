import 'server-only'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { LEGAL_ENTITY, PRODUCT_NAME } from '@/lib/brand'
import { siteOrigin } from '@/lib/stripe'

export const ACCOUNT_COOKIE = 'commons_account'

function sessionSecret(): string {
  const explicit = process.env.ACCOUNT_SESSION_SECRET?.trim()
  if (explicit) return explicit
  const stripe = process.env.STRIPE_SECRET_KEY?.trim()
  if (stripe) return `account:${stripe}`
  throw new Error('ACCOUNT_SESSION_SECRET or STRIPE_SECRET_KEY required for account sessions')
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function newRawToken(): string {
  return randomBytes(32).toString('base64url')
}

type SessionPayload = { email: string; exp: number }

function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', sessionSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

function verify(cookieValue: string): SessionPayload | null {
  const [body, sig] = cookieValue.split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', sessionSecret()).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload
    if (!payload.email || typeof payload.exp !== 'number') return null
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export async function readAccountEmail(): Promise<string | null> {
  const jar = await cookies()
  const raw = jar.get(ACCOUNT_COOKIE)?.value
  if (!raw) return null
  return verify(raw)?.email ?? null
}

export async function setAccountCookie(email: string): Promise<void> {
  const jar = await cookies()
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 14
  jar.set(ACCOUNT_COOKIE, sign({ email: email.toLowerCase(), exp }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  })
}

export async function clearAccountCookie(): Promise<void> {
  const jar = await cookies()
  jar.delete(ACCOUNT_COOKIE)
}

export function accountMagicLinkUrl(rawToken: string): string {
  return `${siteOrigin()}/api/account/verify?token=${encodeURIComponent(rawToken)}`
}

export async function sendAccountMagicLink(email: string, url: string): Promise<'sent' | 'logged'> {
  const key = process.env.RESEND_API_KEY?.trim()
  const from = process.env.ACCOUNT_FROM_EMAIL?.trim() || 'onboarding@resend.dev'
  if (!key) {
    console.info('[commons-account] magic link (no RESEND_API_KEY)', { email, url })
    return 'logged'
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `${PRODUCT_NAME} account sign-in`,
      text: [
        `Sign in to your ${PRODUCT_NAME} billing account.`,
        '',
        url,
        '',
        `This link expires in 30 minutes.`,
        `A product of ${LEGAL_ENTITY}.`,
      ].join('\n'),
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend failed: ${res.status} ${body}`)
  }
  return 'sent'
}
