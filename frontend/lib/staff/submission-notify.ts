/**
 * Notify staff by email when a site/portal form is submitted.
 * Uses the shared Gmail send mailbox (GMAIL_*). Mail lands in the recipient’s
 * @shmspto.org Inbox — Gmail app + Staff → Inbox when Google is connected.
 */
import { getSiteSettings } from '@/lib/api/site-settings'
import { sendMassEmail, type SendMassEmailResult } from '@/lib/staff/mass-email'
import { resolveGmailSendAuth } from '@/lib/staff/gmail-send-auth'
import { normalizeStaffInbox, STAFF_INBOX_FALLBACK } from '@/lib/staff/inbox'

export type SubmissionNotifyKind =
  | 'contact'
  | 'programs'
  | 'events'
  | 'sponsorship'
  | 'volunteer'
  | 'newsletter'
  | 'survey'
  | 'membership-experience'

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
    case 'membership-experience':
      return 'Membership experience'
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
  if (explicit.includes('@')) return normalizeStaffInbox(explicit)

  const settings = await getSiteSettings()
  if (kind === 'programs') {
    return normalizeStaffInbox(
      settings.get('contactEmailPrograms', STAFF_INBOX_FALLBACK),
    )
  }
  if (kind === 'events') {
    return normalizeStaffInbox(
      settings.get('contactEmailEvents', 'vp-events@shmspto.org'),
    )
  }
  if (kind === 'sponsorship') {
    return normalizeStaffInbox(
      settings.get('contactEmailSponsorship', 'vp-initiatives@shmspto.org'),
    )
  }
  if (kind === 'membership-experience') {
    return normalizeStaffInbox(
      settings.get(
        'contactEmailMembershipExperience',
        'vp-membershipexperience@shmspto.org',
      ),
    )
  }
  if (kind === 'volunteer') {
    return normalizeStaffInbox(
      settings.get(
        'contactEmailVolunteer',
        settings.get('contactEmailGeneral', STAFF_INBOX_FALLBACK),
      ),
    )
  }
  if (kind === 'newsletter' || kind === 'survey') {
    return normalizeStaffInbox(
      settings.get(
        'contactEmailMarketing',
        settings.get('contactEmailGeneral', STAFF_INBOX_FALLBACK),
      ),
    )
  }
  return normalizeStaffInbox(
    settings.get('contactEmailGeneral', STAFF_INBOX_FALLBACK),
  )
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
  const auth = await resolveGmailSendAuth().catch(() => null)
  if (!auth) {
    return { ok: false, mode: 'skipped', reason: 'Gmail send not configured' }
  }

  const to = await resolveSubmissionInbox(opts.kind, opts.to)
  if (!to) {
    return { ok: false, mode: 'skipped', reason: 'No staff inbox resolved' }
  }

  const prefix = `[SHMS PTO · ${topicLabel(opts.kind)}]`
  const subject = opts.subject.startsWith('[SHMS PTO')
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
