/**
 * Notify staff by email when a site/portal form is submitted.
 * Uses the shared Gmail send mailbox (GMAIL_*). Mail lands in the recipient’s
 * @shmspto.org Inbox. Gmail app + Staff → Inbox when Google is connected.
 */
import { getSiteSettings } from '@/lib/api/site-settings'
import { sendMassEmail, type SendMassEmailResult } from '@/lib/staff/mass-email'
import { resolveGmailSendAuth } from '@/lib/staff/gmail-send-auth'
import {
  DEFAULT_PROGRAMS_INBOXES,
  DEFAULT_SPONSORSHIP_INBOXES,
  DEFAULT_TREASURER_INBOX,
  ensureTreasurerCoverage,
  normalizeStaffInbox,
  parseStaffInboxes,
  resolveTreasurerInboxes,
  STAFF_INBOX_FALLBACK,
} from '@/lib/staff/inbox'

export type SubmissionNotifyKind =
  | 'contact'
  | 'programs'
  | 'events'
  | 'sponsorship'
  | 'volunteer'
  | 'newsletter'
  | 'survey'
  | 'membership-experience'
  | 'portal-help'

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
    case 'portal-help':
      return 'Member portal help'
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
  if (explicit.includes('@')) {
    const list = parseStaffInboxes(explicit)
    return list.join(', ') || STAFF_INBOX_FALLBACK
  }

  const settings = await getSiteSettings()
  if (kind === 'programs') {
    const list = parseStaffInboxes(
      settings.get('contactEmailPrograms', DEFAULT_PROGRAMS_INBOXES),
    )
    return list.join(', ') || DEFAULT_PROGRAMS_INBOXES
  }
  if (kind === 'events') {
    return normalizeStaffInbox(
      settings.get('contactEmailEvents', 'vp-community-events@shmspto.org'),
    )
  }
  if (kind === 'sponsorship') {
    const list = parseStaffInboxes(
      settings.get('contactEmailSponsorship', DEFAULT_SPONSORSHIP_INBOXES),
    )
    return list.join(', ') || DEFAULT_SPONSORSHIP_INBOXES
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
  if (kind === 'newsletter' || kind === 'survey' || kind === 'portal-help') {
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

/** Member portal help form → president + membership + marketing. */
export async function resolvePortalHelpRecipients(): Promise<string[]> {
  const settings = await getSiteSettings()
  const president = normalizeStaffInbox(
    settings.get('presidentEmail', settings.get('contactEmailGeneral', STAFF_INBOX_FALLBACK)),
  )
  const membership = normalizeStaffInbox(
    settings.get(
      'contactEmailMembershipExperience',
      'vp-membershipexperience@shmspto.org',
    ),
  )
  const marketing = normalizeStaffInbox(
    settings.get('contactEmailMarketing', 'vp-marketing@shmspto.org'),
  )
  return Array.from(
    new Set([president, membership, marketing].map((e) => e.trim().toLowerCase()).filter(Boolean)),
  )
}

export async function notifyStaffSubmission(opts: {
  kind: SubmissionNotifyKind
  /** Override inbox (e.g. contact assignedTo). */
  to?: string
  /** When set, emails all of these instead of a single resolved inbox. */
  recipients?: string[]
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

  const recipients = ensureTreasurerCoverage(
    opts.recipients && opts.recipients.length
      ? opts.recipients.flatMap((e) => parseStaffInboxes(e))
      : parseStaffInboxes(await resolveSubmissionInbox(opts.kind, opts.to)),
  )

  if (!recipients.length || !recipients[0]) {
    return { ok: false, mode: 'skipped', reason: 'No staff inbox resolved' }
  }

  const prefix = `[SHMS PTO · ${topicLabel(opts.kind)}]`
  const subject = opts.subject.startsWith('[SHMS PTO')
    ? opts.subject
    : `${prefix} ${opts.subject}`.trim()

  return sendMassEmail(
    {
      subject,
      body: opts.body.trim(),
      fromName: opts.fromName || 'SHMS PTO Website',
      replyTo: opts.replyTo || undefined,
      recipients,
    },
    { allowInternal: true },
  )
}

export type TransactionNotifyKind =
  | 'membership'
  | 'product'
  | 'store-card'
  | 'program'
  | 'event'
  | 'donation'

function transactionLabel(kind: TransactionNotifyKind, description?: string): string {
  const desc = String(description || '').toLowerCase()
  // Defense: bags/enrollments must never show as Cove/shop even if kind was wrong.
  if (
    kind === 'product' &&
    (/enrichment|bag\b|enroll|program:|competitive math|robotics|chess|coding/i.test(desc) ||
      desc.includes('classes'))
  ) {
    return 'Program enrollment'
  }
  if (kind === 'product' && /in-person sales|square stand/i.test(desc)) {
    return 'In-person Stand sale'
  }
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
  const president = normalizeStaffInbox(
    settings.get('presidentEmail', 'president@shmspto.org'),
  )
  const treasurerList = resolveTreasurerInboxes(
    settings.get('contactEmailTreasurer', DEFAULT_TREASURER_INBOX),
  )
  const storeCoordinator = normalizeStaffInbox(
    settings.get('contactEmailStoreCoordinator', 'cove@shmspto.org'),
  )
  const coveStaff = normalizeStaffInbox(
    settings.get('contactEmailCoveStaff', 'cove-staff@shmspto.org'),
  )
  const vpSales = normalizeStaffInbox(
    settings.get('contactEmailVpSales', 'vp-sales@shmspto.org'),
  )
  const secretary = normalizeStaffInbox(
    settings.get('contactEmailSecretary', 'secretary@shmspto.org'),
  )
  const recipients = ensureTreasurerCoverage(
    [to, president, ...treasurerList, storeCoordinator, coveStaff, vpSales, secretary]
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )

  const label = transactionLabel(opts.kind, opts.description)
  const amount =
    Number.isFinite(opts.amount) ? `$${Number(opts.amount).toFixed(2)}` : String(opts.amount)
  const name = (opts.parentName || '').trim() || '(no name)'
  const lines = [
    `A ${label.toLowerCase()} just processed on shmspto.org.`,
    '',
    `Parent: ${name}`,
    `Email: ${opts.parentEmail}`,
    `Order: ${opts.description}`,
    `Amount: ${amount}`,
    `Reference: ${opts.transactionId}`,
  ]
  if (opts.paymentMethod) lines.push(`Payment: ${opts.paymentMethod}`)
  if (opts.meta) {
    const skip =
      /^(cartPartsJson|cartTitles|gan|giftCardId|coveBalance|accountNumber|studentId|programId)$/i
    const desc = String(opts.description || '').trim().toLowerCase()
    for (const [k, v] of Object.entries(opts.meta)) {
      if (!v || skip.test(k)) continue
      if (String(v).length > 180) continue
      // Avoid repeating Order line as programName / productName
      if (/^(programName|productName|description)$/i.test(k)) {
        if (String(v).trim().toLowerCase() === desc) continue
        if (/in-person sales|square stand/i.test(String(v)) && label === 'Program enrollment') {
          continue
        }
      }
      lines.push(`${k}: ${v}`)
    }
  }

  if (opts.kind === 'membership') {
    const tier = String(opts.meta?.tier || opts.meta?.tierName || '').trim()
    if (tier) {
      const { staffMembershipPerkLines } = await import('@/lib/membership-entitlements')
      const perkLines = staffMembershipPerkLines({
        tier,
        shirtSize: opts.meta?.shirtSize || null,
      })
      if (perkLines.length) {
        lines.push('', ...perkLines)
      }
    }
  }

  lines.push('', 'Staff → Members / Payments / Fulfillments for details.')

  return sendMassEmail(
    {
      subject: `[SHMS PTO · ${label}] ${opts.description} · ${amount}`,
      body: lines.join('\n'),
      fromName: 'SHMS PTO Website',
      replyTo: opts.parentEmail,
      recipients,
    },
    { allowInternal: true },
  )
}
