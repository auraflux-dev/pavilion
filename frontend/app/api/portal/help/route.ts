/**
 * POST /api/portal/help
 * Signed-in parent help form → ContactSubmissions + email
 * president@, vp-membershipexperience@, vp-marketing@ (CMS overrides).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getWixClient } from '@/lib/wix-client'
import {
  notifyStaffSubmission,
  resolvePortalHelpRecipients,
} from '@/lib/staff/submission-notify'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'
import { reportError } from '@/lib/observability/error-reporting'

const TOPICS = new Set([
  'Account & login',
  'Students',
  'Membership',
  'The Cove / store card',
  'Programs',
  'Website / content',
  'Other',
])

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session?.email) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  try {
    const rl = rateLimit(`portal-help:${clientIp(req)}`, 6, 10 * 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many submissions. Please wait and try again.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      )
    }

    const body = await req.json().catch(() => ({}))
    const topicRaw = String(body.topic ?? '').trim()
    const topic = TOPICS.has(topicRaw) ? topicRaw : 'Other'
    const message = String(body.message ?? '').trim()
    const name =
      String(body.name ?? '').trim() ||
      `${session.member?.contact?.firstName ?? ''} ${session.member?.contact?.lastName ?? ''}`.trim() ||
      session.email

    if (!message || message.length < 10) {
      return NextResponse.json(
        { error: 'Please include a bit more detail (at least a sentence).' },
        { status: 400 },
      )
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message is too long.' }, { status: 400 })
    }

    const recipients = await resolvePortalHelpRecipients()
    const email = session.email.trim().toLowerCase()
    const routedMessage = [
      `[Route: Member portal help · ${recipients.join(', ')}]`,
      '',
      message,
    ].join('\n')

    const client = getWixClient()
    const base = {
      name,
      email,
      topic: `Portal help · ${topic}`,
      message: routedMessage,
      submittedAt: new Date().toISOString(),
      resolved: false,
    }

    try {
      await client.items.insert('ContactSubmissions', {
        ...base,
        department: 'portal-help',
        assignedTo: recipients.join(','),
      })
    } catch {
      await client.items.insert('ContactSubmissions', base)
    }

    const notify = await notifyStaffSubmission({
      kind: 'portal-help',
      recipients,
      subject: topic,
      replyTo: email,
      body: [
        'New Member Portal help request.',
        '',
        `From: ${name} <${email}>`,
        `Topic: ${topic}`,
        `Sent to: ${recipients.join(', ')}`,
        '',
        message,
        '',
        'Reply to this email to respond to the parent.',
        'Also saved in Wix CMS → ContactSubmissions (department portal-help).',
      ].join('\n'),
    })

    return NextResponse.json({
      ok: true,
      recipients,
      emailed: notify.ok === true,
      emailMode: 'mode' in notify ? notify.mode : undefined,
    })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/portal/help' })
    return NextResponse.json({ error: 'Failed to submit', eventId }, { status: 500 })
  }
}
