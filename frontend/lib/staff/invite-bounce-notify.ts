/**
 * When Gmail bounces a household invite, tell the account owner (email + portal).
 * DSNs still land on the sending mailbox; this copies the owner so president@ is not the only notice.
 */
import { getWixClient } from '@/lib/wix-client'
import { getMessage, listMessages } from '@/lib/google/gmail'
import { sendMassEmail } from '@/lib/staff/mass-email'
import { preferredGmailSender } from '@/lib/staff/gmail-send-auth'
import {
  listPendingGuardianInvites,
  markGuardianBounceNotified,
  type FamilyGuardianRow,
} from '@/lib/family-guardians'

const BOUNCE_QUERY =
  'newer_than:3d (subject:(Undeliverable OR "Delivery Status Notification" OR "Mail delivery failed" OR "failure notice") OR from:(mailer-daemon OR "mail delivery subsystem"))'

const SKIP_DOMAIN = /@(?:shmspto\.org|google\.com|mailer-daemon\.)/i

function extractEmails(text: string): string[] {
  const found = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
  return [...new Set(found.map((e) => e.toLowerCase()))].filter((e) => !SKIP_DOMAIN.test(e))
}

async function bouncedAddressesForMailbox(staffEmail: string): Promise<Set<string>> {
  const out = new Set<string>()
  const items = await listMessages(staffEmail, { query: BOUNCE_QUERY, maxResults: 25 })
  for (const item of items) {
    const fromMeta = extractEmails(`${item.subject} ${item.snippet}`)
    for (const e of fromMeta) out.add(e)
    if (fromMeta.length > 0) continue
    try {
      const full = await getMessage(staffEmail, item.id)
      for (const e of extractEmails(`${full.bodyText} ${full.snippet}`)) out.add(e)
    } catch {
      /* snippet is enough for most DSNs */
    }
  }
  return out
}

function bounceCopy(guardianEmail: string): { subject: string; body: string } {
  const subject = `Your household invite to ${guardianEmail} did not go through`
  const body = [
    `We could not deliver the family-account invite to ${guardianEmail}.`,
    'That is usually a mistype.',
    '',
    'Please open Member Portal → My Students → Share portal access:',
    '1. Remove that address if it is still listed',
    '2. Invite again. Type the email twice so it matches',
    '3. If they still do not get mail, use Copy link and send it yourself',
    '',
    'https://shmspto.org/member-portal',
    '',
    'The other adult must sign in with the exact email you invite.',
  ].join('\n')
  return { subject, body }
}

async function alreadyNotifiedOwner(row: FamilyGuardianRow, subject: string): Promise<boolean> {
  const primary = String(row.primaryParentEmail ?? '').trim().toLowerCase()
  if (!primary) return false
  if (row.bounceNotifiedAt) return true
  try {
    const client = getWixClient()
    const result = await client.items
      .query('ParentMessages')
      .eq('parentEmail', primary)
      .eq('subject', subject)
      .limit(1)
      .find()
    return (result.items ?? []).length > 0
  } catch {
    return false
  }
}

async function notifyOwner(row: FamilyGuardianRow): Promise<boolean> {
  const primary = String(row.primaryParentEmail ?? '').trim().toLowerCase()
  const guardian = String(row.guardianEmail ?? '').trim().toLowerCase()
  if (!primary || !guardian) return false
  const { subject, body } = bounceCopy(guardian)

  let emailed = false
  try {
    await sendMassEmail({
      subject,
      body,
      fromName: 'SHMS PTO',
      replyTo: primary,
      recipients: [primary],
    })
    emailed = true
  } catch (err) {
    console.warn('[invite-bounce] owner email failed', err)
  }

  let messaged = false
  try {
    const client = getWixClient()
    await client.items.insert('ParentMessages', {
      parentEmail: primary,
      audience: 'family',
      grade: null,
      studentId: null,
      studentName: null,
      programName: '',
      fromName: 'SHMS PTO',
      subject,
      body,
      sentAt: new Date().toISOString(),
      active: true,
    })
    messaged = true
  } catch (err) {
    console.warn('[invite-bounce] ParentMessages insert failed', err)
  }

  if (!emailed && !messaged) return false
  try {
    await markGuardianBounceNotified(row)
  } catch (err) {
    console.warn('[invite-bounce] bounceNotifiedAt save failed', err)
  }
  return true
}

export async function notifyHouseholdInviteBounces(): Promise<{
  bounced: number
  notified: number
  skipped: number
  mailboxes: string[]
}> {
  const pending = await listPendingGuardianInvites()
  if (pending.length === 0) {
    return { bounced: 0, notified: 0, skipped: 0, mailboxes: [] }
  }

  const pendingEmails = new Set(
    pending.map((r) => String(r.guardianEmail ?? '').trim().toLowerCase()).filter(Boolean),
  )
  const mailboxes = [...new Set(['president@shmspto.org', await preferredGmailSender()])]

  const bounced = new Set<string>()
  const scanned: string[] = []
  for (const box of mailboxes) {
    try {
      const found = await bouncedAddressesForMailbox(box)
      for (const e of found) {
        if (pendingEmails.has(e)) bounced.add(e)
      }
      scanned.push(box)
    } catch (err) {
      console.warn('[invite-bounce] mailbox skip', box, err instanceof Error ? err.message : err)
    }
  }

  let notified = 0
  let skipped = 0
  for (const row of pending) {
    const guardian = String(row.guardianEmail ?? '').trim().toLowerCase()
    if (!guardian || !bounced.has(guardian)) continue
    const { subject } = bounceCopy(guardian)
    if (await alreadyNotifiedOwner(row, subject)) {
      skipped += 1
      continue
    }
    const ok = await notifyOwner(row)
    if (ok) notified += 1
  }

  return { bounced: bounced.size, notified, skipped, mailboxes: scanned }
}
