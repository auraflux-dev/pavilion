import { publicSiteUrl } from '@/lib/demo/instance'
import {
  decryptSecret,
  encryptSecret,
  googleOAuthClient,
  googleOAuthConfigured,
} from '@/lib/staff/seo/crypto'
import { CLIENT_PERMISSIONS_COPY, type GscQueryRow } from '@/lib/staff/seo/workspace'

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const IDENTITY_SCOPES = 'openid email profile'

export function googleRedirectUri(reqOrigin?: string) {
  const explicit = process.env.SEO_GOOGLE_REDIRECT_URI?.trim()
  if (explicit) return explicit
  const origin = (reqOrigin || publicSiteUrl()).replace(/\/$/, '')
  return `${origin}/api/staff/seo/oauth/google/callback`
}

export function buildGoogleAuthUrl(opts: {
  workspaceId: string
  tool: 'gsc' | 'ga4'
  returnPath?: string
  googleHd?: string | null
  inviteToken?: string | null
  redirectOrigin?: string
}): {
  provider: 'google_direct'
  authUrl: string | null
  message: string
  permissionsCopy: string
} {
  if (!googleOAuthConfigured()) {
    return {
      provider: 'google_direct',
      authUrl: null,
      message: [
        'Set SEO_GOOGLE_CLIENT_ID and SEO_GOOGLE_CLIENT_SECRET',
        '(or GOOGLE_CLIENT_*) to enable Connect.',
      ].join('\n'),
      permissionsCopy: CLIENT_PERMISSIONS_COPY,
    }
  }
  const { clientId } = googleOAuthClient()
  const state = Buffer.from(
    JSON.stringify({
      workspaceId: opts.workspaceId,
      tool: opts.tool,
      returnPath: opts.returnPath || '/staff?view=seo',
      inviteToken: opts.inviteToken || null,
      nonce: Date.now(),
    }),
    'utf8',
  ).toString('base64url')

  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  u.searchParams.set('client_id', clientId)
  u.searchParams.set('redirect_uri', googleRedirectUri(opts.redirectOrigin))
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('scope', `${IDENTITY_SCOPES} ${GSC_SCOPE}`)
  u.searchParams.set('access_type', 'offline')
  u.searchParams.set('prompt', 'consent')
  u.searchParams.set('state', state)
  const hd = opts.googleHd?.trim()
  if (hd) u.searchParams.set('hd', hd)

  return {
    provider: 'google_direct',
    authUrl: u.toString(),
    message: hd
      ? `Complete Google consent with a @${hd} Workspace account (read-only).`
      : 'Complete Google consent for this workspace (read-only).',
    permissionsCopy: CLIENT_PERMISSIONS_COPY,
  }
}

export async function exchangeGoogleCode(code: string, reqOrigin?: string): Promise<{
  refreshToken: string
  accessToken: string
  email?: string
}> {
  const { clientId, clientSecret } = googleOAuthClient()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(reqOrigin),
      grant_type: 'authorization_code',
    }),
  })
  const json = (await res.json()) as {
    refresh_token?: string
    access_token?: string
    error?: string
    error_description?: string
  }
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || 'Token exchange failed')
  }
  let email: string | undefined
  try {
    email = await fetchGoogleUserEmail(json.access_token)
  } catch {
    /* optional */
  }
  return {
    refreshToken: json.refresh_token || '',
    accessToken: json.access_token,
    email,
  }
}

export async function googleAccessToken(refreshTokenEnc: string): Promise<string> {
  const refresh = decryptSecret(refreshTokenEnc)
  const { clientId, clientSecret } = googleOAuthClient()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refresh,
      grant_type: 'refresh_token',
    }),
  })
  const json = (await res.json()) as { access_token?: string; error?: string }
  if (!res.ok || !json.access_token) throw new Error(json.error || 'Refresh failed')
  return json.access_token
}

export async function listGscSites(accessToken: string): Promise<string[]> {
  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const json = (await res.json()) as { siteEntry?: { siteUrl: string }[]; error?: { message: string } }
  if (!res.ok) throw new Error(json.error?.message || 'GSC sites list failed')
  return (json.siteEntry || []).map((s) => s.siteUrl)
}

export async function fetchGoogleUserEmail(accessToken: string): Promise<string | undefined> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const json = (await res.json()) as { email?: string }
  if (!res.ok) return undefined
  return json.email?.trim().toLowerCase()
}

export async function fetchGscSearchAnalytics(opts: {
  accessToken: string
  siteUrl: string
  days?: number
}): Promise<GscQueryRow[]> {
  const days = opts.days ?? 28
  const end = new Date()
  const start = new Date(Date.now() - days * 86400000)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(opts.siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${opts.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        startDate: fmt(start),
        endDate: fmt(end),
        dimensions: ['query'],
        rowLimit: 250,
      }),
    },
  )
  const json = (await res.json()) as {
    rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[]
    error?: { message: string }
  }
  if (!res.ok) throw new Error(json.error?.message || 'GSC query failed')
  return (json.rows || []).map((r) => ({
    query: r.keys[0] || '',
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }))
}

export { encryptSecret, decryptSecret }
