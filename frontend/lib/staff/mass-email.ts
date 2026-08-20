/**
 * Mass email for VP Memberships outreach.
 * Primary: Gmail API (Google Workspace mailbox via OAuth refresh token).
 * Fallback: preview + mailto BCC when Gmail is not configured.
 */

import { sanitizeTestRecipients } from './newsletter-test-groups'

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
  html?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

const EMAIL_DOMAIN_FIX: Record<string, string> = {
  'yahoo.comm': 'yahoo.com',
  'yhaoo.fr': 'yahoo.fr',
  'hotmail.cm': 'hotmail.com',
  'gmail.con': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'hmail.com': 'gmail.com',
}

const BLOCKED_EMAIL_DOMAINS = new Set(['example.com', 'example.org', 'example.net'])

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim().toLowerCase())
}

/** Lowercase, trim, and fix common domain typos. */
export function sanitizeDirectoryEmail(raw: string): string {
  const e = String(raw ?? '').trim().toLowerCase()
  const at = e.lastIndexOf('@')
  if (at < 1) return e
  return `${e.slice(0, at)}@${EMAIL_DOMAIN_FIX[e.slice(at + 1)] || e.slice(at + 1)}`
}

function isOutreachEmail(email: string): boolean {
  if (!isValidEmail(email)) return false
  const domain = email.split('@')[1] || ''
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return false
  if (email.endsWith('@shmspto.org')) return false
  return true
}

export function sanitizeRecipients(emails: string[]): string[] {
  const out = new Set<string>()
  for (const raw of emails) {
    const e = sanitizeDirectoryEmail(raw)
    if (isOutreachEmail(e)) out.add(e)
  }
  return Array.from(out).sort()
}

/** Build a mailto URL with BCC for staffer's own mail client (no API key needed). */
export function buildMailtoBcc(draft: MassEmailDraft, opts: { testSend?: boolean } = {}): string {
  const sanitize = opts.testSend ? sanitizeTestRecipients : sanitizeRecipients
  const recipients = sanitize(draft.recipients)
  const params = new URLSearchParams()
  params.set('subject', draft.subject.trim())
  params.set('body', draft.body.trim())
  if (recipients.length) params.set('bcc', recipients.join(','))
  return `mailto:${encodeURIComponent(draft.replyTo || '')}?${params.toString()}`
}

export function validateMassEmailDraft(
  draft: MassEmailDraft,
  opts: { testSend?: boolean } = {},
): string | null {
  if (!draft.subject.trim()) return 'Subject is required'
  if (!draft.body.trim()) return 'Message body is required'
  const sanitize = opts.testSend ? sanitizeTestRecipients : sanitizeRecipients
  if (sanitize(draft.recipients).length === 0) {
    return opts.testSend
      ? 'No valid test recipients (add a personal email on your Staff profile, or pick Board test group)'
      : 'No valid recipient emails for this audience'
  }
  return null
}

export function gmailConfigured(): boolean {
  const clientId =
    process.env.GMAIL_CLIENT_ID?.trim() || process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
  const clientSecret =
    process.env.GMAIL_CLIENT_SECRET?.trim() || process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
 // Env refresh token path. StaffGoogleTokens fallback is checked async in sendMassEmail.
  return Boolean(
    clientId &&
      clientSecret &&
      process.env.GMAIL_REFRESH_TOKEN?.trim() &&
      process.env.GMAIL_SENDER?.trim(),
  )
}

/** @deprecated alias. UI still asks emailConfigured */
export function emailConfigured(): boolean {
  return gmailConfigured()
}

export function gmailSenderAddress(): string {
  return process.env.GMAIL_SENDER?.trim().toLowerCase() || 'president@shmspto.org'
}

export function gmailFromHeader(fromName: string, senderEmail?: string): string {
  const sender = (senderEmail || gmailSenderAddress()).trim().toLowerCase()
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
  opts: {
    dryRun?: boolean
    testSend?: boolean
    /** Per-recipient subject/body/html overrides (merge fields). */
    personalize?: (to: string) => {
      subject?: string
      body?: string
      html?: string
    }
  } = {},
): Promise<SendMassEmailResult> {
  const validation = validateMassEmailDraft(draft, { testSend: opts.testSend })
  if (validation) {
    return { ok: false, mode: 'unavailable', sent: 0, failed: 0, errors: [validation] }
  }

  const sanitize = opts.testSend ? sanitizeTestRecipients : sanitizeRecipients
  const recipients = sanitize(draft.recipients)
  if (opts.dryRun) {
    return {
      ok: true,
      mode: 'dry_run',
      sent: recipients.length,
      failed: 0,
      errors: [],
    }
  }

  const { resolveGmailSendAuth } = await import('./gmail-send-auth')
  let auth: Awaited<ReturnType<typeof resolveGmailSendAuth>> = null
  try {
    auth = await resolveGmailSendAuth()
  } catch (err) {
    return {
      ok: false,
      mode: 'unavailable',
      sent: 0,
      failed: recipients.length,
      errors: [err instanceof Error ? err.message : 'Could not resolve Gmail auth'],
    }
  }

  if (!auth) {
    return {
      ok: false,
      mode: 'unavailable',
      sent: 0,
      failed: recipients.length,
      errors: [
        'Gmail send is not ready. In Staff → Inbox, Connect Google while signed in as president@shmspto.org (or treasurer@ / vp-membershipexperience@), or set GMAIL_REFRESH_TOKEN + GMAIL_SENDER on Vercel.',
      ],
    }
  }

  const accessToken = auth.accessToken
  const from = gmailFromHeader(draft.fromName, auth.senderEmail)
  const replyTo = (draft.replyTo || auth.senderEmail).trim()
  const errors: string[] = []
  let sent = 0
  let failed = 0
  let lastId: string | undefined

  for (const to of recipients) {
    try {
      const personalized = opts.personalize?.(to)
      const raw = buildRawMimeMessage({
        from,
        to,
        replyTo,
        subject: (personalized?.subject ?? draft.subject).trim(),
        text: (personalized?.body ?? draft.body).trim(),
        html: (personalized?.html ?? draft.html)?.trim(),
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
  const clientId =
    process.env.GMAIL_CLIENT_ID?.trim() || process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
  const clientSecret =
    process.env.GMAIL_CLIENT_SECRET?.trim() || process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
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
  html?: string
}): string {
  const subject = encodeRfc2047(opts.subject)
  const text = opts.text.replace(/\r?\n/g, '\r\n')
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    ...(opts.replyTo ? [`Reply-To: ${opts.replyTo}`] : []),
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
  ]

  if (opts.html?.trim()) {
    const boundary = `nl_${Date.now().toString(36)}`
    const html = opts.html.replace(/\r?\n/g, '\r\n')
    const mime = [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      text,
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      html,
      `--${boundary}--`,
    ].join('\r\n')
    return encodeRawMime(mime)
  }

  const mime = [
    ...headers,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
  ].join('\r\n')
  return encodeRawMime(mime)
}

function encodeRawMime(mime: string): string {
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
