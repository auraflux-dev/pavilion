import { NextRequest, NextResponse } from 'next/server'
import {
  accountMagicLinkUrl,
  hashToken,
  newRawToken,
  sendAccountMagicLink,
} from '@/lib/account'
import { findLatestSubscriptionByEmail, insertAccountToken } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: { email?: string }
  try {
    body = (await req.json()) as { email?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = String(body.email || '')
    .trim()
    .toLowerCase()
  if (!email.includes('@')) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  // Always return the same shape so we do not leak who has an account.
  const ok = { ok: true as const, message: 'If that email is on file, a sign-in link is on the way.' }

  try {
    const sub = await findLatestSubscriptionByEmail(email)
    if (!sub) return NextResponse.json(ok)

    const raw = newRawToken()
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30)
    await insertAccountToken({ email, tokenHash: hashToken(raw), expiresAt })
    const url = accountMagicLinkUrl(raw)
    const delivery = await sendAccountMagicLink(email, url)

    const payload: Record<string, unknown> = { ...ok }
    if (delivery === 'logged' && process.env.ACCOUNT_DEV_LINKS === '1') {
      payload.devLink = url
    }
    return NextResponse.json(payload)
  } catch (err) {
    console.error('account request-link failed', err)
    return NextResponse.json({ error: 'Could not start sign-in. Try again.' }, { status: 502 })
  }
}
