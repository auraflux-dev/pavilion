/**
 * Google Workspace access for the signed-in staffer (@shmspto.org).
 *
 * Preferred: service account + domain-wide delegation (impersonate staff email).
 * Fallback: per-staff OAuth refresh token (StaffGoogleTokens CMS or legacy GMAIL_* send mailbox).
 */
import { createSign } from 'node:crypto'
import { getWixClient } from '@/lib/wix-client'

export const GOOGLE_SCOPES = {
  gmail: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
  ],
  calendar: ['https://www.googleapis.com/auth/calendar.readonly'],
  drive: ['https://www.googleapis.com/auth/drive.readonly'],
} as const

export const ALL_WORKSPACE_SCOPES = [
  ...GOOGLE_SCOPES.gmail,
  ...GOOGLE_SCOPES.calendar,
  ...GOOGLE_SCOPES.drive,
]

export type WorkspaceCapability = 'mail' | 'calendar' | 'docs' | 'reply'

export function workspaceServiceAccountConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim(),
  )
}

export function workspaceLegacySendConfigured(): boolean {
  return Boolean(
    process.env.GMAIL_CLIENT_ID?.trim() &&
      process.env.GMAIL_CLIENT_SECRET?.trim() &&
      process.env.GMAIL_REFRESH_TOKEN?.trim() &&
      process.env.GMAIL_SENDER?.trim(),
  )
}

export function workspaceOauthClientConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim(),
  )
}

function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, '\n').trim()
}

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8')
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

/** JWT bearer for domain-wide delegation (impersonate `subjectEmail`). */
export async function getServiceAccountAccessToken(
  subjectEmail: string,
  scopes: readonly string[],
): Promise<string> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()
  const privateKey = normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '')
  if (!clientEmail || !privateKey) {
    throw new Error('Google service account is not configured')
  }

  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(
    JSON.stringify({
      iss: clientEmail,
      sub: subjectEmail.trim().toLowerCase(),
      scope: scopes.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )
  const unsigned = `${header}.${claim}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  const sig = base64url(signer.sign(privateKey))
  const assertion = `${unsigned}.${sig}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string
    error?: string
    error_description?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        `Google service-account token failed (${res.status})`,
    )
  }
  return data.access_token
}

async function getStoredStaffRefreshToken(email: string): Promise<string | null> {
  try {
    const client = getWixClient()
    const result = await client.items
      .query('StaffGoogleTokens')
      .eq('email', email.trim().toLowerCase())
      .eq('active', true)
      .limit(1)
      .find()
    const row = result.items?.[0] as { refreshToken?: string } | undefined
    const token = String(row?.refreshToken ?? '').trim()
    return token || null
  } catch {
    return null
  }
}

export async function upsertStaffRefreshToken(email: string, refreshToken: string) {
  const client = getWixClient()
  const normalized = email.trim().toLowerCase()
  const existing = await client.items
    .query('StaffGoogleTokens')
    .eq('email', normalized)
    .limit(1)
    .find()
  const found = existing.items?.[0] as { _id?: string } | undefined
  const payload = {
    email: normalized,
    refreshToken,
    active: true,
    updatedAt: new Date().toISOString(),
  }
  if (found?._id) {
    await client.items.update('StaffGoogleTokens', { ...found, ...payload, _id: found._id })
  } else {
    await client.items.insert('StaffGoogleTokens', payload)
  }
}

async function refreshUserAccessToken(refreshToken: string): Promise<string> {
  const clientId =
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || process.env.GMAIL_CLIENT_ID?.trim()
  const clientSecret =
    process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || process.env.GMAIL_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth client is not configured')
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string
    error_description?: string
    error?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token refresh failed')
  }
  return data.access_token
}

export type StaffGoogleAccess = {
  accessToken: string
  mode: 'delegation' | 'personal' | 'shared_mailbox'
  email: string
}

/**
 * Access token acting as this staff email (delegation), their connected Google,
 * or the shared blast mailbox when emails match GMAIL_SENDER.
 */
export async function getStaffGoogleAccess(
  staffEmail: string,
  scopes: readonly string[] = ALL_WORKSPACE_SCOPES,
): Promise<StaffGoogleAccess | null> {
  const email = staffEmail.trim().toLowerCase()
  if (!email) return null

  if (workspaceServiceAccountConfigured()) {
    const accessToken = await getServiceAccountAccessToken(email, scopes)
    return { accessToken, mode: 'delegation', email }
  }

  const stored = await getStoredStaffRefreshToken(email)
  if (stored) {
    const accessToken = await refreshUserAccessToken(stored)
    return { accessToken, mode: 'personal', email }
  }

 // Shared send mailbox only. limited (send path); not a full personal hub
  const sender = process.env.GMAIL_SENDER?.trim().toLowerCase()
  if (workspaceLegacySendConfigured() && sender && sender === email) {
    const accessToken = await refreshUserAccessToken(process.env.GMAIL_REFRESH_TOKEN!.trim())
    return { accessToken, mode: 'shared_mailbox', email }
  }

  return null
}

export function workspaceStatusPayload(staffEmail: string, hasPersonalToken: boolean) {
  const delegation = workspaceServiceAccountConfigured()
  const oauthClient = workspaceOauthClientConfigured() || workspaceLegacySendConfigured()
  return {
    email: staffEmail,
    delegationConfigured: delegation,
    connectAvailable: oauthClient && !delegation,
    connected: delegation || hasPersonalToken,
    capabilities: {
      mail: delegation || hasPersonalToken,
      calendar: delegation || hasPersonalToken,
      docs: delegation || hasPersonalToken,
      reply: delegation || hasPersonalToken,
    } satisfies Record<WorkspaceCapability, boolean>,
    setupHint: delegation
      ? null
      : oauthClient
        ? 'Connect your Google Workspace account to load mail, calendar, and docs.'
        : 'Ask an admin to enable Google Workspace (service account domain-wide delegation) for the staff portal.',
  }
}
