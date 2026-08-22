/**
 * Signed unsubscribe links for newsletter / outreach email (CAN-SPAM).
 */
import crypto from 'node:crypto'
import { getWixClient } from '@/lib/wix-client'
import { sanitizeDirectoryEmail } from '@/lib/staff/mass-email'
import { newsletterSiteOrigin } from '@/lib/staff/newsletter-site'

function unsubSecret(): string {
  return (
    process.env.NEWSLETTER_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.GMAIL_CLIENT_SECRET?.trim() ||
    'dev-newsletter-unsub'
  )
}

export function signNewsletterUnsubscribeToken(email: string): string {
  const normalized = sanitizeDirectoryEmail(email)
  const sig = crypto.createHmac('sha256', unsubSecret()).update(normalized).digest('base64url')
  const payload = Buffer.from(normalized, 'utf8').toString('base64url')
  return `${payload}.${sig}`
}

export function verifyNewsletterUnsubscribeToken(token: string): string | null {
  const parts = String(token ?? '').split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  try {
    const email = sanitizeDirectoryEmail(Buffer.from(payload, 'base64url').toString('utf8'))
    const expected = crypto.createHmac('sha256', unsubSecret()).update(email).digest('base64url')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
    if (!email.includes('@')) return null
    return email
  } catch {
    return null
  }
}

export function newsletterUnsubscribePageUrl(email: string): string {
  const token = signNewsletterUnsubscribeToken(email)
  return `${newsletterSiteOrigin()}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
}

/** One-click List-Unsubscribe target (POST from Gmail, etc.). */
export function newsletterUnsubscribeApiUrl(email: string): string {
  const token = signNewsletterUnsubscribeToken(email)
  return `${newsletterSiteOrigin()}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
}

export function maskEmail(email: string): string {
  const e = sanitizeDirectoryEmail(email)
  const at = e.indexOf('@')
  if (at < 2) return '***'
  const local = e.slice(0, at)
  const domain = e.slice(at + 1)
  const shown = local.length <= 2 ? local[0] : `${local.slice(0, 2)}…`
  return `${shown}@${domain}`
}

async function loadAllNewsletterSubscriberRows(): Promise<Record<string, unknown>[]> {
  const client = getWixClient()
  const items: Record<string, unknown>[] = []
  let skip = 0
  for (let i = 0; i < 50; i += 1) {
    const result = await client.items.query('NewsletterSubscribers').limit(100).skip(skip).find()
    const batch = (result.items ?? []) as Record<string, unknown>[]
    items.push(...batch)
    if (batch.length < 100) break
    skip += 100
  }
  return items
}

export function isNewsletterOptedOut(row: Record<string, unknown>): boolean {
  if (row.active === false) return true
  return Boolean(String(row.unsubscribedAt ?? '').trim())
}

export async function loadNewsletterOptOutEmails(): Promise<Set<string>> {
  const rows = await loadAllNewsletterSubscriberRows()
  const out = new Set<string>()
  for (const row of rows) {
    if (!isNewsletterOptedOut(row)) continue
    const email = sanitizeDirectoryEmail(String(row.email ?? row.parentEmail ?? ''))
    if (email.includes('@')) out.add(email)
  }
  return out
}

export function filterNewsletterOptOuts(
  emails: string[],
  optOuts: Set<string>,
): string[] {
  if (!optOuts.size) return emails
  return emails.filter((raw) => !optOuts.has(sanitizeDirectoryEmail(raw)))
}

export async function recordNewsletterUnsubscribe(email: string): Promise<string> {
  const client = getWixClient()
  const normalized = sanitizeDirectoryEmail(email)
  const now = new Date().toISOString()
  const existing = await client.items.query('NewsletterSubscribers').eq('email', normalized).limit(1).find()
  const row = existing.items?.[0] as { _id?: string } | undefined
  if (row?._id) {
    await client.items.update('NewsletterSubscribers', {
      _id: row._id,
      email: normalized,
      active: false,
      unsubscribedAt: now,
    })
  } else {
    await client.items.insert('NewsletterSubscribers', {
      email: normalized,
      active: false,
      unsubscribedAt: now,
    })
  }
  return normalized
}

export function appendNewsletterComplianceText(
  body: string,
  opts: { physicalAddress?: string; unsubscribeUrl?: string },
): string {
  const lines: string[] = []
  const trimmed = String(body ?? '').trimEnd()
  if (opts.physicalAddress?.trim()) lines.push(opts.physicalAddress.trim())
  if (opts.unsubscribeUrl?.trim()) {
    lines.push(`Unsubscribe from SHMS PTO emails: ${opts.unsubscribeUrl.trim()}`)
  }
  if (!lines.length) return trimmed
  return `${trimmed}\n\n---\n${lines.join('\n')}`
}
