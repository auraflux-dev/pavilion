/**
 * Mass email for VP Memberships outreach.
 * Primary: Gmail API (Google Workspace mailbox via OAuth refresh token).
 * Fallback: preview + mailto BCC when Gmail is not configured.
 */

export type EmailAudience =
  | 'all'
  | 'free'
  | 'paid'
  | 'reef'
  | 'lagoon'
  | 'tide'
  | 'grade'
  | 'custom'

export type MassEmailDraft = {
  subject: string
  body: string
  fromName: string
  replyTo?: string
  recipients: string[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim().toLowerCase())
}

export function sanitizeRecipients(emails: string[]): string[] {
  const out = new Set<string>()
  for (const raw of emails) {
    const e = String(raw ?? '').trim().toLowerCase()
    if (isValidEmail(e)) out.add(e)
  }
  return Array.from(out).sort()
}

/** Build a mailto URL with BCC for staffer's own mail client (no API key needed). */
export function buildMailtoBcc(draft: MassEmailDraft): string {
  const recipients = sanitizeRecipients(draft.recipients)
  const params = new URLSearchParams()
  params.set('subject', draft.subject.trim())
  params.set('body', draft.body.trim())
  if (recipients.length) params.set('bcc', recipients.join(','))
  return `mailto:${encodeURIComponent(draft.replyTo || '')}?${params.toString()}`
}

export function validateMassEmailDraft(draft: MassEmailDraft): string | null {
  if (!draft.subject.trim()) return 'Subject is required'
  if (!draft.body.trim()) return 'Message body is required'
  if (sanitizeRecipients(draft.recipients).length === 0) {
    return 'No valid recipient emails for this audience'
  }
  return null
}

export function gmailConfigured(): boolean {
  return Boolean(
    process.env.GMAIL_CLIENT_ID?.trim() &&
      process.env.GMAIL_CLIENT_SECRET?.trim() &&
      process.env.GMAIL_REFRESH_TOKEN?.trim() &&
      process.env.GMAIL_SENDER?.trim(),
  )
}

/** @deprecated alias — UI still asks emailConfigured */
export function emailConfigured(): boolean {
  return gmailConfigured()
}

export function gmailSenderAddress(): string {
  return process.env.GMAIL_SENDER?.trim().toLowerCase() || ''
}

export function gmailFromHeader(fromName: string): string {
  const sender = gmailSenderAddress()
  const name = (process.env.GMAIL_FROM_NAME?.trim() || fromName || 'SHMS PTO').replace(
    /[\r\n"]/g,
    '',
  )
  return `${name} <${sender}>`
}

export type SendMassEmailResult = {
  ok: boolean
  mode: 'gmail' | 'dry_run' | 'unavailable'
  sent: number
  failed: number
  errors: string[]
  id?: string
}

/**
 * Send one message per recipient via Gmail API (list privacy + Sent folder trail).
 * dryRun skips the network call.
 */
export async function sendMassEmail(
  draft: MassEmailDraft,
  opts: { dryRun?: boolean } = {},
): Promise<SendMassEmailResult> {
  const validation = validateMassEmailDraft(draft)
  if (validation) {
    return { ok: false, mode: 'unavailable', sent: 0, failed: 0, errors: [validation] }
  }

  const recipients = sanitizeRecipients(draft.recipients)
  if (opts.dryRun) {
    return {
      ok: true,
      mode: 'dry_run',
      sent: recipients.length,
      failed: 0,
      errors: [],
    }
  }

  if (!gmailConfigured()) {
    return {
      ok: false,
      mode: 'unavailable',
      sent: 0,
      failed: recipients.length,
      errors: [
        'Gmail API is not configured. Use mailto BCC, or set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, and GMAIL_SENDER.',
      ],
    }
  }

  let accessToken: string
  try {
    accessToken = await refreshGmailAccessToken()
  } catch (err) {
    return {
      ok: false,
      mode: 'unavailable',
      sent: 0,
      failed: recipients.length,
      errors: [err instanceof Error ? err.message : 'Could not refresh Gmail token'],
    }
  }

  const from = gmailFromHeader(draft.fromName)
  const replyTo = (draft.replyTo || gmailSenderAddress()).trim()
  const errors: string[] = []
  let sent = 0
  let failed = 0
  let lastId: string | undefined

  for (const to of recipients) {
    try {
      const raw = buildRawMimeMessage({
        from,
        to,
        replyTo,
        subject: draft.subject.trim(),
        text: draft.body.trim(),
      })
      const res = await fetch(GMAIL_SEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        id?: string
        error?: { message?: string }
      }
      if (!res.ok) {
        failed += 1
        errors.push(`${to}: ${data.error?.message || res.statusText || 'send failed'}`)
      } else {
        sent += 1
        lastId = data.id ?? lastId
      }
    } catch (err) {
      failed += 1
      errors.push(`${to}: ${err instanceof Error ? err.message : 'send failed'}`)
    }
    // Gentle pacing for Workspace daily limits (low volume blasts)
    await sleep(150)
  }

  return {
    ok: failed === 0,
    mode: 'gmail',
    sent,
    failed,
    errors: errors.slice(0, 20),
    id: lastId,
  }
}

export async function refreshGmailAccessToken(): Promise<string> {
  const clientId = process.env.GMAIL_CLIENT_ID?.trim()
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim()
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim()
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Gmail OAuth env vars')
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const res = await fetch(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string
    error?: string
    error_description?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || `Gmail token refresh failed (${res.status})`,
    )
  }
  return data.access_token
}

/** RFC 2822 message → Gmail raw (base64url). */
export function buildRawMimeMessage(opts: {
  from: string
  to: string
  replyTo?: string
  subject: string
  text: string
}): string {
  const subject = encodeRfc2047(opts.subject)
  const mime = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    ...(opts.replyTo ? [`Reply-To: ${opts.replyTo}`] : []),
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    opts.text.replace(/\r?\n/g, '\r\n'),
  ].join('\r\n')

  return Buffer.from(mime, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function encodeRfc2047(subject: string): string {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject
  const b64 = Buffer.from(subject, 'utf8').toString('base64')
  return `=?UTF-8?B?${b64}?=`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
