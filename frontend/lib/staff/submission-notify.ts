/**
 * Notify staff by email when a site/portal form is submitted.
 * Uses the shared Gmail send mailbox (GMAIL_*). Mail lands in the recipient’s
 * @shmspto.org Inbox — Gmail app + Staff → Inbox when Google is connected.
 */
import { getSiteSettings } from '@/lib/api/site-settings'
import {
  gmailConfigured,
  sendMassEmail,
  type SendMassEmailResult,
} from '@/lib/staff/mass-email'

export type SubmissionNotifyKind =
  | 'contact'
  | 'programs'
  | 'events'
  | 'sponsorship'
  | 'volunteer'
  | 'newsletter'
  | 'survey'

function topicLabel(kind: SubmissionNotifyKind): string {
  switch (kind) {
    case 'contact':
      return 'Contact form'
    case 'programs':
      return 'Programs contact'
    case 'events':
      return 'Event idea'
    case 'sponsorship':
      return 'Sponsorship inquiry'
    case 'volunteer':
      return 'Volunteer signup'
    case 'newsletter':
      return 'Newsletter signup'
    case 'survey':
      return 'Survey response'
  }
}

/** Resolve which @shmspto.org mailbox should receive this submission. */
export async function resolveSubmissionInbox(
  kind: SubmissionNotifyKind,
  overrideTo?: string,
): Promise<string> {
  const explicit = String(overrideTo ?? '')
    .trim()
    .toLowerCase()
  if (explicit.includes('@')) return explicit

  const settings = await getSiteSettings()
  if (kind === 'programs') {
    return settings
      .get('contactEmailPrograms', 'fundraising@shmspto.org')
      .trim()
      .toLowerCase()
  }
  if (kind === 'events') {
    return settings
      .get('contactEmailEvents', 'vp-events@shmspto.org')
      .trim()
      .toLowerCase()
  }
  if (kind === 'sponsorship') {
    return settings
      .get('contactEmailSponsorship', 'vp-initiatives@shmspto.org')
      .trim()
      .toLowerCase()
  }
  if (kind === 'volunteer') {
    return settings
      .get('contactEmailVolunteer', settings.get('contactEmailGeneral', 'info@shmspto.org'))
      .trim()
      .toLowerCase()
  }
  if (kind === 'newsletter' || kind === 'survey') {
    return settings
      .get('contactEmailMarketing', settings.get('contactEmailGeneral', 'info@shmspto.org'))
      .trim()
      .toLowerCase()
  }
  return settings.get('contactEmailGeneral', 'info@shmspto.org').trim().toLowerCase()
}

export async function notifyStaffSubmission(opts: {
  kind: SubmissionNotifyKind
  /** Override inbox (e.g. contact assignedTo). */
  to?: string
  subject: string
  body: string
  /** Parent/submitter email for Reply-To. */
  replyTo?: string
  fromName?: string
}): Promise<SendMassEmailResult | { ok: false; mode: 'skipped'; reason: string }> {
  if (!gmailConfigured()) {
    return { ok: false, mode: 'skipped', reason: 'Gmail send not configured' }
  }

  const to = await resolveSubmissionInbox(opts.kind, opts.to)
  if (!to) {
    return { ok: false, mode: 'skipped', reason: 'No staff inbox resolved' }
  }

  const prefix = `[SHMS PTO · ${topicLabel(opts.kind)}]`
  const subject = opts.subject.startsWith('[SHMS')
    ? opts.subject
    : `${prefix} ${opts.subject}`.trim()

  return sendMassEmail({
    subject,
    body: opts.body.trim(),
    fromName: opts.fromName || 'SHMS PTO Website',
    replyTo: opts.replyTo || undefined,
    recipients: [to],
  })
}
