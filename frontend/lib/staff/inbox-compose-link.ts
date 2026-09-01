/** Deep link into Staff → Inbox with compose open and To prefilled. */
export function staffInboxComposeHref(to: string, subject?: string): string {
  const email = to.trim()
  const params = new URLSearchParams({ view: 'inbox', compose: '1', to: email })
  const sub = subject?.trim()
  if (sub) params.set('subject', sub)
  return `/staff?${params.toString()}`
}

export const STAFF_INBOX_COMPOSE_PENDING_TO_KEY = 'staff-inbox-compose-pending-to'
