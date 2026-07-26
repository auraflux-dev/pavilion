/**
 * POST /api/portal/business-owner
 * Member-only: business-owner interest form → ContactSubmissions + email
 * VP Membership Experience (vp-membershipexperience@shmspto.org).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getWixClient } from '@/lib/wix-client'
import { getSiteSettings } from '@/lib/api/site-settings'
import { notifyStaffSubmission } from '@/lib/staff/submission-notify'
import { normalizeStaffInbox } from '@/lib/staff/inbox'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'
import { reportError } from '@/lib/observability/error-reporting'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_INBOX = 'vp-membershipexperience@shmspto.org'

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session?.email) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  try {
    const rl = rateLimit(`business-owner:${clientIp(req)}`, 6, 10 * 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many submissions. Please wait and try again.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      )
    }

    const body = await req.json().catch(() => ({}))
    const isBusinessOwner = body.isBusinessOwner === true || body.isBusinessOwner === 'yes'
    const businessName = String(body.businessName ?? '').trim()
    const website = String(body.website ?? '').trim()
    const details = String(body.details ?? '').trim()
    const name =
      String(body.name ?? '').trim() ||
      `${session.member?.contact?.firstName ?? ''} ${session.member?.contact?.lastName ?? ''}`.trim() ||
      session.email
    const email = String(body.email ?? session.email).trim().toLowerCase()

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    if (isBusinessOwner && !businessName) {
      return NextResponse.json(
        { error: 'Please share your business name so we can follow up.' },
        { status: 400 },
      )
    }

    const settings = await getSiteSettings()
    const assignedTo = normalizeStaffInbox(
      settings.get('contactEmailMembershipExperience', DEFAULT_INBOX),
    )

    const topic = isBusinessOwner
      ? 'Business owner · membership experience'
      : 'Not a business owner · membership experience'
    const messageLines = [
      `[Route: VP Membership Experience · ${assignedTo}]`,
      '',
      `Business owner / family owns a business: ${isBusinessOwner ? 'Yes' : 'No'}`,
    ]
    if (isBusinessOwner) {
      messageLines.push(`Business name: ${businessName}`)
      if (website) messageLines.push(`Website: ${website}`)
      if (details) messageLines.push('', 'More about the business:', details)
    } else if (details) {
      messageLines.push('', details)
    }

    const routedMessage = messageLines.join('\n')
    const base = {
      name,
      email,
      topic,
      message: routedMessage,
      submittedAt: new Date().toISOString(),
      resolved: false,
    }

    const client = getWixClient()
    try {
      await client.items.insert('ContactSubmissions', {
        ...base,
        department: 'membership-experience',
        assignedTo,
      })
    } catch {
      await client.items.insert('ContactSubmissions', base)
    }

    const notify = await notifyStaffSubmission({
      kind: 'membership-experience',
      to: assignedTo,
      subject: isBusinessOwner
        ? `Business owner: ${businessName}`
        : 'Member: not a business owner',
      replyTo: email,
      body: [
        'New business-owner form from the Member Portal.',
        '',
        `From: ${name} <${email}>`,
        `Account: ${session.email}`,
        `Routed to: ${assignedTo}`,
        '',
        routedMessage,
        '',
        'Reply to this email to respond to the parent.',
        'Also saved in Wix CMS → ContactSubmissions.',
      ].join('\n'),
    })

    return NextResponse.json({
      ok: true,
      assignedTo,
      emailed: notify.ok === true,
    })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/portal/business-owner' })
    return NextResponse.json({ error: 'Failed to submit', eventId }, { status: 500 })
  }
}
