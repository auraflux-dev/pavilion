/**
 * Staff inboxes that do not exist (or bounce). Route to president until aliases are created.
 */
const DEAD_INBOXES = new Set([
  'info@shmspto.org',
  'membership@shmspto.org',
  'marketing@shmspto.org',
  'programs@shmspto.org',
  'noreply@shmspto.org',
  'bandaruds@shmspto.org',
])

/** Remap retired aliases to live mailboxes. */
const INBOX_ALIASES: Record<string, string> = {
  'vp-programs@shmspto.org': 'vp-initiatives@shmspto.org',
  'wellness@shmspto.org': 'bayansouqi@shmspto.org',
  'vp-events@shmspto.org': 'vp-community-events@shmspto.org',
}

export const STAFF_INBOX_FALLBACK = 'president@shmspto.org'

/** Default sponsorship form inboxes (comma-separated in SiteSettings). */
export const DEFAULT_SPONSORSHIP_INBOXES =
  'vp-sponsorships@shmspto.org, president@shmspto.org'

/** Default programs contact form inboxes (comma-separated in SiteSettings). */
export const DEFAULT_PROGRAMS_INBOXES =
  'vp-initiatives@shmspto.org, president@shmspto.org'

/** Canonical treasurer inbox (president@ is added while Labor Day coverage is active). */
export const DEFAULT_TREASURER_INBOX =
  'treasurer@shmspto.org'

/** Coverage ends the morning after Labor Day 2026 (Mon Sep 7). */
export const TREASURER_COVERAGE_UNTIL_ISO = '2026-09-08'

export function treasurerCoverageActive(now = new Date()): boolean {
  return now.getTime() < Date.parse(`${TREASURER_COVERAGE_UNTIL_ISO}T04:00:00.000Z`)
}

/** Resolve treasurer inboxes (SiteSettings may be comma-separated; president@ while covered). */
export function resolveTreasurerInboxes(raw?: string | null): string[] {
  const list = parseStaffInboxes(raw || DEFAULT_TREASURER_INBOX)
  const base = list.length ? list : parseStaffInboxes(DEFAULT_TREASURER_INBOX)
  return ensureTreasurerCoverage(base)
}

/** If any recipient is treasurer@, also include president@ while coverage is active. */
export function ensureTreasurerCoverage(recipients: string[]): string[] {
  const out = Array.from(
    new Set(
      recipients
        .flatMap((e) => parseStaffInboxes(e))
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@')),
    ),
  )
  if (!treasurerCoverageActive()) return out
  const hitsTreasurer = out.some((e) => e.startsWith('treasurer@'))
  if (!hitsTreasurer) return out
  const president = normalizeStaffInbox(STAFF_INBOX_FALLBACK)
  if (president && !out.includes(president)) out.push(president)
  return out
}

/** Map missing board aliases to a live mailbox. */
export function normalizeStaffInbox(email: string | null | undefined): string {
  const e = String(email ?? '')
    .trim()
    .toLowerCase()
  if (!e) return STAFF_INBOX_FALLBACK
  if (INBOX_ALIASES[e]) return INBOX_ALIASES[e]
  if (DEAD_INBOXES.has(e)) return STAFF_INBOX_FALLBACK
  return e
}

/** Split a CMS inbox field that may list several addresses. */
export function parseStaffInboxes(raw: string | null | undefined): string[] {
  const out = new Set<string>()
  for (const part of String(raw ?? '').split(/[,;]+/)) {
    const e = normalizeStaffInbox(part)
    if (e.includes('@')) out.add(e)
  }
  return Array.from(out)
}
