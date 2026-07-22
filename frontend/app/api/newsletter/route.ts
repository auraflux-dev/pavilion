import { NextRequest, NextResponse } from 'next/server'
import { subscribeToNewsletter } from '@/lib/api/newsletter'
import { notifyStaffSubmission } from '@/lib/staff/submission-notify'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'
import { reportError } from '@/lib/observability/error-reporting'

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`newsletter:${clientIp(req)}`, 10, 10 * 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait and try again.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      )
    }

    const { email } = await req.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    const normalized = String(email).trim().toLowerCase()
    await subscribeToNewsletter(normalized)

    const notify = await notifyStaffSubmission({
      kind: 'newsletter',
      subject: 'New newsletter subscriber',
      replyTo: normalized,
      body: [
        'Someone subscribed to the newsletter from the website.',
        '',
        `Email: ${normalized}`,
        '',
        'Saved in Wix CMS → NewsletterSubscribers.',
        'Staff Newsletter blasts still use the membership roster (separate list).',
      ].join('\n'),
    })

    return NextResponse.json({
      ok: true,
      emailed: notify.ok === true,
      emailMode: 'mode' in notify ? notify.mode : undefined,
    })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/newsletter' })
    return NextResponse.json({ error: 'Failed to subscribe', eventId }, { status: 500 })
  }
}
