import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getSiteSettings } from '@/lib/api/site-settings'
import { notifyStaffSubmission } from '@/lib/staff/submission-notify'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'
import { reportError } from '@/lib/observability/error-reporting'
import { normalizeStaffInbox, STAFF_INBOX_FALLBACK } from '@/lib/staff/inbox'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function resolveAssignedTo(
  department: string | undefined,
  assignedTo: string | undefined,
  settings: Awaited<ReturnType<typeof getSiteSettings>>
): string {
  const explicit = String(assignedTo ?? '').trim().toLowerCase()
  if (explicit && EMAIL_RE.test(explicit)) return normalizeStaffInbox(explicit)

  const dept = String(department ?? '').trim().toLowerCase()
  if (dept === 'programs') {
    return normalizeStaffInbox(
      settings.get('contactEmailPrograms', STAFF_INBOX_FALLBACK),
    )
  }
  if (dept === 'events') {
    return normalizeStaffInbox(
      settings.get('contactEmailEvents', 'vp-events@shmspto.org'),
    )
  }
  if (dept === 'sponsorship' || dept === 'initiatives') {
    return normalizeStaffInbox(
      settings.get('contactEmailSponsorship', 'vp-initiatives@shmspto.org'),
    )
  }
  if (dept === 'treasurer') {
    return normalizeStaffInbox(
      settings.get('contactEmailTreasurer', 'treasurer@shmspto.org'),
    )
  }
  return normalizeStaffInbox(
    settings.get('contactEmailGeneral', STAFF_INBOX_FALLBACK),
  )
}

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`contact:${clientIp(req)}`, 8, 10 * 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many submissions. Please wait and try again.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      )
    }

    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const topic = String(body.topic ?? 'General Question').trim() || 'General Question'
    const message = String(body.message ?? '').trim()
    const department = String(body.department ?? '').trim().toLowerCase() || 'general'

    if (!name || !email || !EMAIL_RE.test(email) || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const settings = await getSiteSettings()
    const assignedTo = resolveAssignedTo(department, body.assignedTo, settings)
    const kind =
      department === 'programs'
        ? 'programs'
        : department === 'events'
          ? 'events'
          : department === 'sponsorship' || department === 'initiatives'
            ? 'sponsorship'
            : 'contact'

    const client = getWixClient()
    const routeLabel =
      kind === 'programs'
        ? 'VP Programs'
        : kind === 'events'
          ? 'VP Events'
          : kind === 'sponsorship'
            ? 'VP Initiatives'
            : null
    const routedMessage = routeLabel
      ? `[Route: ${routeLabel} · ${assignedTo}]\n\n${message}`
      : message
    const base = {
      name,
      email,
      topic,
      message: routedMessage,
      submittedAt: new Date().toISOString(),
      resolved: false,
    }

    try {
      await client.items.insert('ContactSubmissions', {
        ...base,
        department,
        assignedTo,
      })
    } catch {
      await client.items.insert('ContactSubmissions', base)
    }

    const notify = await notifyStaffSubmission({
      kind,
      to: assignedTo,
      subject: topic,
      replyTo: email,
      body: [
        `New ${kind} submission from the website.`,
        '',
        `From: ${name} <${email}>`,
        `Topic: ${topic}`,
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
      emailMode: 'mode' in notify ? notify.mode : undefined,
    })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/contact' })
    return NextResponse.json({ error: 'Failed to submit', eventId }, { status: 500 })
  }
}
