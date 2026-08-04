/**
 * Notify staff by email when a site/portal form is submitted.
 * Uses the shared Gmail send mailbox (GMAIL_*). Mail lands in the recipient’s
 * @shmspto.org Inbox. Gmail app + Staff → Inbox when Google is connected.
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

export type TransactionNotifyKind =
  | 'membership'
  | 'product'
  | 'store-card'
  | 'program'
  | 'event'
  | 'donation'

function transactionLabel(kind: TransactionNotifyKind): string {
  switch (kind) {
    case 'membership':
      return 'Membership sale'
    case 'product':
      return 'Cove / shop sale'
    case 'store-card':
      return 'Cove Digital Card load'
    case 'program':
      return 'Program enrollment'
    case 'event':
      return 'Event tickets'
    case 'donation':
      return 'Donation'
  }
}

/** Paid checkout alerts → VP Membership Experience (CMS override supported). */
export async function resolveTransactionInbox(overrideTo?: string): Promise<string> {
  return resolveSubmissionInbox('membership-experience', overrideTo)
}

/**
 * Email vp-membershipexperience@ (or CMS override) when a parent checkout succeeds.
 * Best-effort. never blocks fulfillment.
 */
export async function notifyStaffTransaction(opts: {
  kind: TransactionNotifyKind
  parentEmail: string
  parentName?: string
  amount: number
  description: string
  transactionId: string
  paymentMethod?: string
  meta?: Record<string, string>
}): Promise<SendMassEmailResult | { ok: false; mode: 'skipped'; reason: string }> {
  const auth = await resolveGmailSendAuth().catch(() => null)
  if (!auth) {
    return { ok: false, mode: 'skipped', reason: 'Gmail send not configured' }
  }

  const to = await resolveTransactionInbox()
  if (!to) {
    return { ok: false, mode: 'skipped', reason: 'No staff inbox resolved' }
  }

  const settings = await getSiteSettings()
  const treasurer = normalizeStaffInbox(
    settings.get('contactEmailTreasurer', 'treasurer@shmspto.org'),
  )
  const recipients = Array.from(
    new Set([to, treasurer].map((e) => e.trim().toLowerCase()).filter(Boolean)),
  )

  const amount =
    Number.isFinite(opts.amount) ? `$${Number(opts.amount).toFixed(2)}` : String(opts.amount)
  const name = (opts.parentName || '').trim() || '(no name)'
  const lines = [
    `A ${transactionLabel(opts.kind).toLowerCase()} just processed on shmspto.org.`,
    '',
    `Parent: ${name}`,
    `Email: ${opts.parentEmail}`,
    `Order: ${opts.description}`,
    `Amount: ${amount}`,
    `Reference: ${opts.transactionId}`,
  ]
  if (opts.paymentMethod) lines.push(`Payment: ${opts.paymentMethod}`)
  if (opts.meta) {
    for (const [k, v] of Object.entries(opts.meta)) {
      if (v) lines.push(`${k}: ${v}`)
    }
  }

  if (opts.kind === 'membership') {
    const tier = String(opts.meta?.tier || opts.meta?.tierName || '').trim()
    if (tier) {
      const { buildMembershipEntitlements } = await import('@/lib/membership-entitlements')
      const ents = buildMembershipEntitlements({
        tier,
        shirtSize: opts.meta?.shirtSize || null,
      })
      const physical = ents.filter((e) => e.kind === 'spirit_shirt' || e.kind === 'magnet')
      const refreshments = ents.find((e) => e.kind === 'event_refreshments')
      if (physical.length || refreshments) {
        lines.push('', 'Fulfillment / member perks:')
        for (const e of physical) {
          lines.push(
            `• ${e.label}${e.detail ? ` (${e.detail})` : ''} — ${e.status}. ${e.notes || ''}`.trim(),
          )
        }
        if (refreshments) {
          lines.push(
            `• ${refreshments.label} — parent shows Family Cove 6-digit code (paid codes end in 9); record code and hand tickets.`,
          )
        }
        lines.push(
          'No mailing address yet (3PL later). Pick up at Open House Aug 13, or parent emails vp-membershipexperience@shmspto.org to coordinate.',
        )
      }
    }
  }

  lines.push('', 'Staff → Members / Payments / Fulfillments for details.')

  return sendMassEmail({
    subject: `[SHMS PTO · ${transactionLabel(opts.kind)}] ${opts.description} · ${amount}`,
    body: lines.join('\n'),
    fromName: 'SHMS PTO Website',
    replyTo: opts.parentEmail,
    recipients,
  })
}
