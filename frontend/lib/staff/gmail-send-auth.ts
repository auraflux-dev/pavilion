/**
 * Resolve Gmail send credentials for transactional + outreach mail.
 *
 * Staff blasts (preferSender = logged-in @shmspto.org): use that user's Connect Google
 * token (StaffGoogleTokens in CMS). Automated mail (no preferSender): shared GMAIL_* env.
 */
import { getWixClient } from '@/lib/wix-client'
import {
  getStaffGoogleAccess,
  GOOGLE_SCOPES,
  workspaceOauthClientConfigured,
  workspaceServiceAccountConfigured,
} from '@/lib/google/workspace-auth'

const DEFAULT_SENDERS = [
  'president@shmspto.org',
  'treasurer@shmspto.org',
  'vp-membershipexperience@shmspto.org',
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

/** Active Connect Google mailboxes (StaffGoogleTokens) usable for automated send. */
async function listActiveStaffGoogleSenders(): Promise<string[]> {
  try {
    const client = getWixClient()
    const found = await client.items.query('StaffGoogleTokens').eq('active', true).limit(50).find()
    return (found.items ?? [])
      .map((row) => String((row as { email?: string }).email ?? '').trim().toLowerCase())
      .filter(Boolean)
  } catch {
    return []
  }
}

export async function resolveGmailSendAuth(preferSender?: string): Promise<GmailSendAuth | null> {
  const fromName =
    process.env.GMAIL_FROM_NAME?.trim() ||
    (await siteSetting('gmailFromName')) ||
    'SHMS PTO'

  const staffSender = preferSender?.trim().toLowerCase()
  const envRefresh = process.env.GMAIL_REFRESH_TOKEN?.trim()
  const envSender = process.env.GMAIL_SENDER?.trim().toLowerCase()
  const clientId =
    process.env.GMAIL_CLIENT_ID?.trim() || process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
  const clientSecret =
    process.env.GMAIL_CLIENT_SECRET?.trim() || process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()

  /** Staff-initiated outreach: send as the logged-in board member (Connect Google token). */
  if (staffSender) {
    try {
      const access = await getStaffGoogleAccess(staffSender, GOOGLE_SCOPES.gmail)
      if (access?.accessToken) {
        return {
          accessToken: access.accessToken,
          senderEmail: access.email,
          fromName,
          mode: access.mode === 'delegation' ? 'delegation' : 'staff_token',
        }
      }
    } catch {
      // Only fall back to shared env mailbox when it matches the staff From address.
    }
    if (envSender && envSender !== staffSender) {
      return null
    }
  }

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

  if (!workspaceOauthClientConfigured() && !clientId && !workspaceServiceAccountConfigured()) {
    return null
  }

  const preferred = await preferredGmailSender()
  const connectedMailboxes = await listActiveStaffGoogleSenders().catch(() => [] as string[])
  const candidates = Array.from(
    new Set(
      [staffSender, preferred, ...DEFAULT_SENDERS, ...connectedMailboxes]
        .map((e) => String(e ?? '').trim().toLowerCase())
        .filter(Boolean),
    ),
  )

  const refreshErrors: string[] = []
  for (const email of candidates) {
    try {
      const access = await getStaffGoogleAccess(email, GOOGLE_SCOPES.gmail)
      if (!access?.accessToken) continue
      return {
        accessToken: access.accessToken,
        senderEmail: access.email,
        fromName,
        mode: access.mode === 'delegation' ? 'delegation' : 'staff_token',
      }
    } catch (err) {
      refreshErrors.push(
        `${email}: ${err instanceof Error ? err.message : 'token refresh failed'}`,
      )
    }
  }
  if (refreshErrors.length) {
    console.warn('[gmail-send-auth] no usable staff token', refreshErrors.slice(0, 5))
  }
  return null
}

export async function gmailSendReady(preferSender?: string): Promise<{
  ok: boolean
  senderEmail: string | null
  mode: GmailSendAuth['mode'] | null
  hint: string
}> {
  try {
    const auth = await resolveGmailSendAuth(preferSender)
    if (auth) {
      return {
        ok: true,
        senderEmail: auth.senderEmail,
        mode: auth.mode,
        hint: preferSender
          ? `Sending as ${auth.senderEmail} (${auth.mode}) — matches signed-in staff.`
          : `Sending as ${auth.senderEmail} (${auth.mode}).`,
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
  const staff = preferSender?.trim().toLowerCase()
  if (staff) {
    return {
      ok: false,
      senderEmail: null,
      mode: null,
      hint: `Could not send as ${staff}. Sign in to Staff as that @shmspto.org address, open Inbox, and Connect Google once (stores a send token — no GAM or service account on Vercel).`,
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
