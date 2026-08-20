/**
 * Newsletter test-send audiences (board preview, not parent roster).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BLOCKED_EMAIL_DOMAINS = new Set(['example.com', 'example.org', 'example.net'])

const EMAIL_DOMAIN_FIX: Record<string, string> = {
  'yahoo.comm': 'yahoo.com',
  'yhaoo.fr': 'yahoo.fr',
  'hotmail.cm': 'hotmail.com',
  'gmail.con': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'hmail.com': 'gmail.com',
}

function sanitizeDirectoryEmail(raw: string): string {
  const e = String(raw ?? '').trim().toLowerCase()
  const at = e.lastIndexOf('@')
  if (at < 1) return e
  return `${e.slice(0, at)}@${EMAIL_DOMAIN_FIX[e.slice(at + 1)] || e.slice(at + 1)}`
}

function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim().toLowerCase())
}

function isTestEmail(email: string): boolean {
  if (!isValidEmail(email)) return false
  const domain = email.split('@')[1] || ''
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return false
  return true
}

export type TestGroupMember = {
  email: string
  label: string
}

export type NewsletterTestGroups = {
  me: TestGroupMember | null
  board: TestGroupMember[]
  custom: TestGroupMember[]
}

/** Test sends may include @shmspto.org board inboxes and personal Gmail. */
export function sanitizeTestRecipients(emails: string[]): string[] {
  const out = new Set<string>()
  for (const raw of emails) {
    const e = sanitizeDirectoryEmail(raw)
    if (isTestEmail(e)) out.add(e)
  }
  return Array.from(out).sort()
}

export function parseEmailList(raw: string): string[] {
  return sanitizeTestRecipients(
    String(raw ?? '')
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  )
}

export function testSubject(subject: string): string {
  const s = String(subject ?? '').trim()
  if (!s) return '[TEST]'
  return /^\[test\]/i.test(s) ? s : `[TEST] ${s}`
}

type StaffRow = {
  email?: string
  personalEmail?: string
  name?: string
  boardTitle?: string
  active?: boolean
}

export function buildNewsletterTestGroups(opts: {
  sessionEmail: string
  sessionPersonalEmail?: string
  staffRows: StaffRow[]
  siteTestEmails?: string
}): NewsletterTestGroups {
  const meEmail = sanitizeTestRecipients([
    opts.sessionPersonalEmail ?? '',
    opts.sessionEmail,
  ])[0]

  const board: TestGroupMember[] = []
  const seen = new Set<string>()

  for (const row of opts.staffRows) {
    if (row.active === false) continue
    const name = String(row.name ?? row.boardTitle ?? '').trim() || 'Board'
    const role = String(row.boardTitle ?? '').trim()
    const label = role ? `${name} (${role})` : name
    for (const raw of [row.personalEmail, row.email]) {
      const email = sanitizeTestRecipients([String(raw ?? '')])[0]
      if (!email || seen.has(email)) continue
      seen.add(email)
      board.push({ email, label })
    }
  }

  const custom = parseEmailList(opts.siteTestEmails ?? '').map((email) => ({
    email,
    label: email,
  }))

  return {
    me: meEmail ? { email: meEmail, label: 'You' } : null,
    board,
    custom,
  }
}

export function resolveTestGroupRecipients(
  group: 'me' | 'board' | 'custom' | 'board_and_custom',
  groups: NewsletterTestGroups,
  extraEmails: string[] = [],
): string[] {
  const emails: string[] = []
  if (group === 'me' && groups.me) emails.push(groups.me.email)
  if (group === 'board' || group === 'board_and_custom') {
    emails.push(...groups.board.map((m) => m.email))
  }
  if (group === 'custom' || group === 'board_and_custom') {
    emails.push(...groups.custom.map((m) => m.email))
  }
  emails.push(...extraEmails)
  return sanitizeTestRecipients(emails)
}
