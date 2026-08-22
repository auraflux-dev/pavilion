import { NextRequest, NextResponse } from 'next/server'
import {
  maskEmail,
  recordNewsletterUnsubscribe,
  verifyNewsletterUnsubscribeToken,
} from '@/lib/staff/newsletter-unsubscribe'
import { reportError } from '@/lib/observability/error-reporting'

async function processUnsubscribe(token: string | null) {
  const email = verifyNewsletterUnsubscribeToken(token ?? '')
  if (!email) {
    return { ok: false as const, status: 400, error: 'This unsubscribe link is invalid or expired.' }
  }
  await recordNewsletterUnsubscribe(email)
  return { ok: true as const, email: maskEmail(email) }
}

/** One-click unsubscribe (List-Unsubscribe-Post) and direct API use. */
export async function POST(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    const result = await processUnsubscribe(token)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ ok: true, email: result.email })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/newsletter/unsubscribe' })
    return NextResponse.json({ error: 'Could not unsubscribe', eventId }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    const result = await processUnsubscribe(token)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ ok: true, email: result.email })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/newsletter/unsubscribe' })
    return NextResponse.json({ error: 'Could not unsubscribe', eventId }, { status: 500 })
  }
}
