/**
 * Staff inboxes that do not exist (or bounce). Route to president until aliases are created.
 */
const DEAD_INBOXES = new Set(['info@shmspto.org', 'vp-programs@shmspto.org'])

export const STAFF_INBOX_FALLBACK = 'president@shmspto.org'

/** Map missing board aliases to a live mailbox. */
export function normalizeStaffInbox(email: string | null | undefined): string {
  const e = String(email ?? '')
    .trim()
    .toLowerCase()
  if (!e || DEAD_INBOXES.has(e)) return STAFF_INBOX_FALLBACK
  return e
}
