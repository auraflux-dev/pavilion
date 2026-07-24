import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { submitVolunteerForm } from '@/lib/api/volunteers'
import { notifyStaffSubmission } from '@/lib/staff/submission-notify'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'
import { reportError } from '@/lib/observability/error-reporting'

export async function POST(req: NextRequest) {
  try {
    const session = await getMemberSession(req)
    if (!session) {
      return NextResponse.json({ error: 'Log in to sign up to volunteer' }, { status: 401 })
    }

    const rl = rateLimit(`volunteer:${clientIp(req)}`, 8, 10 * 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many submissions. Please wait and try again.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      )
    }

    const body = await req.json()
    const { firstName, lastName, phone, opportunity, notes } = body
    const email = String(body.email ?? session.email ?? '')
      .trim()
      .toLowerCase() || session.email

    if (!firstName || !lastName || !email || !opportunity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await submitVolunteerForm({ firstName, lastName, email, phone, opportunity, notes })

    const name = `${String(firstName).trim()} ${String(lastName).trim()}`.trim()
    const notify = await notifyStaffSubmission({
      kind: 'volunteer',
      subject: `Volunteer: ${String(opportunity).trim()}`,
      replyTo: String(email).trim().toLowerCase(),
      body: [
        'New volunteer signup from the website.',
        '',
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : null,
        `Opportunity: ${opportunity}`,
        notes ? `Notes: ${notes}` : null,
        '',
        'Reply to this email to reach the volunteer.',
        'Also saved in Wix CMS → Volunteers.',
      ]
        .filter(Boolean)
        .join('\n'),
    })

    return NextResponse.json({
      ok: true,
      emailed: notify.ok === true,
      emailMode: 'mode' in notify ? notify.mode : undefined,
    })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/volunteer' })
    return NextResponse.json({ error: 'Failed to submit', eventId }, { status: 500 })
  }
}
