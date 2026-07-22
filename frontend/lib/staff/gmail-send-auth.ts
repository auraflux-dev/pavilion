/**
 * Resolve Gmail send credentials for transactional + outreach mail.
 * Prefers GMAIL_* env; falls back to StaffGoogleTokens for a Workspace mailbox
 * that already used Staff → Connect Google (scopes include gmail.send).
 */
import { getWixClient } from '@/lib/wix-client'
import {
  getStaffGoogleAccess,
  workspaceOauthClientConfigured,
} from '@/lib/google/workspace-auth'

const DEFAULT_SENDERS = [
  'membership@shmspto.org',
  'treasurer@shmspto.org',
  'programs@shmspto.org',
  'noreply@shmspto.org',
]

export type GmailSendAuth = {
  accessToken: string
  senderEmail: string
  fromName: string
  mode: 'env' | 'staff_token' | 'delegation'
}

async function siteSetting(key: string): Promise<string> {
  try {
    const client = getWixClient()
    const found = await client.items.query('SiteSettings').eq('key', key).limit(1).find()
    const row = found.items?.[0] as { value?: string } | undefined
    return String(row?.value ?? '').trim()
  } catch {
    return ''
  }
}

export async function preferredGmailSender(): Promise<string> {
  const fromEnv = process.env.GMAIL_SENDER?.trim().toLowerCase()
  if (fromEnv) return fromEnv
  const fromCms = (await siteSetting('gmailSender')).toLowerCase()
  if (fromCms) return fromCms
  return DEFAULT_SENDERS[0]
}

export async function resolveGmailSendAuth(): Promise<GmailSendAuth | null> {
  const fromName =
    process.env.GMAIL_FROM_NAME?.trim() ||
    (await siteSetting('gmailFromName')) ||
    'SHMS PTO'

  const envRefresh = process.env.GMAIL_REFRESH_TOKEN?.trim()
  const envSender = process.env.GMAIL_SENDER?.trim().toLowerCase()
  const clientId =
    process.env.GMAIL_CLIENT_ID?.trim() || process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
  const clientSecret =
    process.env.GMAIL_CLIENT_SECRET?.trim() || process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()

  if (envRefresh && envSender && clientId && clientSecret) {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: envRefresh,
      grant_type: 'refresh_token',
    })
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = (await res.json().catch(() => ({}))) as { access_token?: string }
    if (res.ok && data.access_token) {
      return {
        accessToken: data.access_token,
        senderEmail: envSender,
        fromName,
        mode: 'env',
      }
    }
  }

  if (!workspaceOauthClientConfigured() && !clientId) return null

  const preferred = await preferredGmailSender()
  const candidates = Array.from(
    new Set([preferred, ...DEFAULT_SENDERS].map((e) => e.trim().toLowerCase()).filter(Boolean)),
  )

  for (const email of candidates) {
    try {
      const access = await getStaffGoogleAccess(email)
      if (!access?.accessToken) continue
      return {
        accessToken: access.accessToken,
        senderEmail: access.email,
        fromName,
        mode: access.mode === 'delegation' ? 'delegation' : 'staff_token',
      }
    } catch {
      // try next mailbox
    }
  }
  return null
}

export async function gmailSendReady(): Promise<{
  ok: boolean
  senderEmail: string | null
  mode: GmailSendAuth['mode'] | null
  hint: string
}> {
  try {
    const auth = await resolveGmailSendAuth()
    if (auth) {
      return {
        ok: true,
        senderEmail: auth.senderEmail,
        mode: auth.mode,
        hint: `Sending as ${auth.senderEmail} (${auth.mode}).`,
      }
    }
  } catch (err) {
    return {
      ok: false,
      senderEmail: null,
      mode: null,
      hint: err instanceof Error ? err.message : 'Gmail auth failed',
    }
  }
  const preferred = await preferredGmailSender()
  return {
    ok: false,
    senderEmail: null,
    mode: null,
    hint: `Connect Google in Staff while signed in as ${preferred} (or set GMAIL_REFRESH_TOKEN on Vercel).`,
  }
}
