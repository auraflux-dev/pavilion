const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i

export function normalizeInviteEmail(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '')
}

export function parseInviteEmailClient(raw: string): { ok: true; email: string } | { ok: false; error: string } {
  const email = normalizeInviteEmail(raw)
  if (!email) return { ok: false, error: 'Enter an email address.' }
  if (!EMAIL_RE.test(email) || email.includes('..')) {
    return { ok: false, error: 'Enter a valid email (name@example.com).' }
  }
  return { ok: true, email }
}

export function validateInviteEmailPair(email: string, confirmEmail: string): string | null {
  const parsed = parseInviteEmailClient(email)
  if (!parsed.ok) return 'Enter the other adult’s email.'
  const confirmed = parseInviteEmailClient(confirmEmail)
  if (!confirmed.ok) return 'Type that email again to confirm it.'
  if (parsed.email !== confirmed.email) return 'The two emails do not match. Check the spelling.'
  return null
}
