/** Emails on a Wix Members record (login + contact). */

export function normalizeMemberEmail(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase()
}

export function collectMemberEmails(member: unknown): string[] {
  const emails = new Set<string>()
  const add = (raw: unknown) => {
    const email = normalizeMemberEmail(raw)
    if (email.includes('@')) emails.add(email)
  }
  const rec = (member ?? {}) as Record<string, unknown>
  const contact = (rec.contact ?? {}) as Record<string, unknown>
  add(rec.loginEmail)
  add(rec.loginEmailAddress)
  const list = contact.emails
  if (Array.isArray(list)) {
    for (const entry of list) {
      if (typeof entry === 'string') add(entry)
      else if (entry && typeof entry === 'object' && 'email' in entry) {
        add((entry as { email?: unknown }).email)
      }
    }
  }
  return [...emails]
}

/** Prefer the board mailbox when Google/Wix also stored a personal Gmail. */
export function pickSessionEmail(emails: string[]): string {
  return emails.find((email) => email.endsWith('@shmspto.org')) || emails[0] || ''
}
