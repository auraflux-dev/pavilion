/**
 * Household invite emails: catch common misspellings before Gmail bounces them
 * to the sending mailbox (president@).
 */
import { resolveMx } from 'node:dns/promises'

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i

const TYPO_DOMAINS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'googlemail.com': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoocom': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'iclould.com': 'icloud.com',
  'iclod.com': 'icloud.com',
  'icoud.com': 'icloud.com',
  'protonmail.co': 'protonmail.com',
}


export function normalizeInviteEmail(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '')
}

export function suggestEmailDomain(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  const mapped = TYPO_DOMAINS[domain]
  return mapped ? `${local}@${mapped}` : null
}

export function parseInviteEmail(raw: string): { ok: true; email: string } | { ok: false; error: string } {
  const email = normalizeInviteEmail(raw)
  if (!email) return { ok: false, error: 'Enter an email address.' }
  if (!EMAIL_RE.test(email) || email.includes('..')) {
    return { ok: false, error: 'Enter a valid email (name@example.com).' }
  }
  return { ok: true, email }
}

export async function domainAcceptsMail(domain: string): Promise<boolean> {
  try {
    const mx = await resolveMx(domain)
    return mx.length > 0
  } catch {
    return false
  }
}

export type InviteEmailCheck =
  | { ok: true; email: string }
  | { ok: false; error: string; suggestion?: string }

export async function checkHouseholdInviteEmail(opts: {
  email: string
  confirmEmail: string
  acceptSuggestion?: boolean
}): Promise<InviteEmailCheck> {
  const parsed = parseInviteEmail(opts.email)
  if (!parsed.ok) return parsed
  const confirmed = parseInviteEmail(opts.confirmEmail)
  if (!confirmed.ok) return { ok: false, error: 'Re-type the email to confirm it.' }
  if (parsed.email !== confirmed.email) {
    return { ok: false, error: 'The two emails do not match. Check the spelling.' }
  }

  const suggestion = suggestEmailDomain(parsed.email)
  if (suggestion && suggestion !== parsed.email && !opts.acceptSuggestion) {
    return {
      ok: false,
      error: `That looks like a misspelling. Did you mean ${suggestion}?`,
      suggestion,
    }
  }

  const domain = parsed.email.slice(parsed.email.lastIndexOf('@') + 1)
  const deliverable = await domainAcceptsMail(domain)
  if (!deliverable) {
    return {
      ok: false,
      error: `“${domain}” does not look like it can receive email. Check the spelling.`,
    }
  }

  return { ok: true, email: parsed.email }
}
