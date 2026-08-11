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
}

export const STAFF_INBOX_FALLBACK = 'president@shmspto.org'

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
