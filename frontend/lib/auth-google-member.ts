/**
 * Parent Google sign-in helpers.
 * Uses our Google OAuth client + Wix Members API (external login), so we do not
 * depend on Wix-hosted /_api/oauth2/authorize after DNS left Wix.
 */
import { createClient, ApiKeyStrategy, OAuthStrategy } from '@wix/sdk'
import { members } from '@wix/members'
import { approvePendingMemberById } from '@/lib/auth-approve-member'

export const GOOGLE_MEMBER_STATE_COOKIE = 'shms_google_oauth'
export const GOOGLE_MEMBER_SCOPES = ['openid', 'email', 'profile'].join(' ')

/**
 * Prefer a dedicated External (public) OAuth client for parents.
 * The staff Workspace client is often Internal (org-only) and returns
 * Google error org_internal for @gmail.com parents.
 */
export function googleMemberOauthConfigured(): boolean {
  return Boolean(googleMemberClientId() && googleMemberClientSecret())
}

export function googleMemberClientId(): string {
  return (
    process.env.GOOGLE_MEMBER_CLIENT_ID?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    process.env.GMAIL_CLIENT_ID?.trim() ||
    ''
  )
}

export function googleMemberClientSecret(): string {
  return (
    process.env.GOOGLE_MEMBER_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ||
    process.env.GMAIL_CLIENT_SECRET?.trim() ||
    ''
  )
}

export function safeReturnTo(raw: unknown): string {
  const value = String(raw || '/member-portal').trim()
  if (!value.startsWith('/') || value.startsWith('//')) return '/member-portal'
  return value
}

/** Canonical site origin for OAuth redirect_uri registration. */
export function googleMemberRedirectBase(hostHeader?: string | null): string {
  const fixed = process.env.GOOGLE_OAUTH_REDIRECT_BASE?.replace(/\/$/, '')
  if (fixed) return fixed

  const host = (hostHeader || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .split(':')[0]
  if (host.includes('localhost') || host.startsWith('127.0.0.1')) {
    return `http://${host}`
  }
  if (
    host === 'www.shmspto.org' ||
    host === 'shmspto.org' ||
    host.endsWith('.vercel.app')
  ) {
    return host === 'shmspto.org' ? 'https://www.shmspto.org' : `https://${host}`
  }
  return 'https://www.shmspto.org'
}

/**
 * Must match an Authorized redirect URI on the Google OAuth client in use.
 *
 * - Dedicated External parent client (`GOOGLE_MEMBER_CLIENT_ID`) →
 *   `/api/auth/google/callback`
 * - Shared staff client (current production fallback) → reuse the URI already
 *   registered at DNS cutover: `/api/staff/workspace/connect/callback`
 *   (member vs staff Connect is distinguished by `state.flow`).
 */
export function googleMemberCallbackUrl(base: string): string {
  const root = base.replace(/\/$/, '')
  if (process.env.GOOGLE_MEMBER_CLIENT_ID?.trim()) {
    return `${root}/api/auth/google/callback`
  }
  return `${root}/api/staff/workspace/connect/callback`
}

/** Finish Google → Wix member session (shared by both callback routes). */
export async function completeGoogleMemberLogin(opts: {
  code: string
  redirectUri: string
}): Promise<{ tokens: Awaited<ReturnType<typeof issueMemberTokensForId>>; email: string }> {
  const { accessToken } = await exchangeGoogleCode(opts.code, opts.redirectUri)
  const profile = await fetchGoogleProfile(accessToken)
  if (!profile.emailVerified) {
    throw new Error('google_email_unverified')
  }
  const memberId = await findOrCreateMemberForGoogle(profile)
  const tokens = await issueMemberTokensForId(memberId)
  return { tokens, email: profile.email }
}

export type GoogleProfile = {
  email: string
  emailVerified: boolean
  givenName?: string
  familyName?: string
  name?: string
  picture?: string
  sub: string
}

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string }> {
  const body = new URLSearchParams({
    code,
    client_id: googleMemberClientId(),
    client_secret: googleMemberClientSecret(),
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
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
      data.error_description || data.error || 'Google token exchange failed',
    )
  }
  return { accessToken: data.access_token }
}

export async function fetchGoogleProfile(
  accessToken: string,
): Promise<GoogleProfile> {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = (await res.json().catch(() => ({}))) as {
    email?: string
    email_verified?: boolean
    given_name?: string
    family_name?: string
    name?: string
    picture?: string
    sub?: string
  }
  if (!res.ok || !data.email || !data.sub) {
    throw new Error('Could not load Google profile')
  }
  return {
    email: data.email.trim().toLowerCase(),
    emailVerified: data.email_verified === true,
    givenName: data.given_name,
    familyName: data.family_name,
    name: data.name,
    picture: data.picture,
    sub: data.sub,
  }
}

function adminMembersClient() {
  const siteId = process.env.WIX_SITE_ID?.trim()
  const apiKey = process.env.WIX_API_KEY?.trim()
  if (!siteId || !apiKey) {
    throw new Error('WIX_SITE_ID and WIX_API_KEY must be set')
  }
  return createClient({
    modules: { members },
    auth: ApiKeyStrategy({ siteId, apiKey }),
  })
}

/** Find existing Wix member by login email, or create an approved member. */
export async function findOrCreateMemberForGoogle(
  profile: GoogleProfile,
): Promise<string> {
  const client = adminMembersClient()
  const email = profile.email

  const existing = await client.members
    .queryMembers()
    .eq('loginEmail', email)
    .limit(1)
    .find()
  const found = existing.items?.[0] as
    | { _id?: string; status?: string }
    | undefined
  const foundId = found?._id
  if (foundId) {
    // Email path can leave PENDING; Google create uses APPROVED. Heal on find.
    const status = String(found?.status || '').toUpperCase()
    if (status === 'PENDING') {
      await approvePendingMemberById(foundId, 'PENDING')
    }
    return foundId
  }

  const nickname =
    profile.name ||
    [profile.givenName, profile.familyName].filter(Boolean).join(' ') ||
    email.split('@')[0]

  const created = await client.members.createMember({
    member: {
      loginEmail: email,
      status: 'APPROVED',
      privacyStatus: 'PRIVATE',
      profile: {
        nickname,
        ...(profile.picture ? { photo: { url: profile.picture } } : {}),
      },
      contact: {
        firstName: profile.givenName || undefined,
        lastName: profile.familyName || undefined,
        emails: [email],
      },
    },
  })

  const id = created._id
  if (!id) throw new Error('Wix did not return a member id after create')
  return id
}

/** Issue member access/refresh tokens via admin external-login grant. */
export async function issueMemberTokensForId(memberId: string) {
  const apiKey = process.env.WIX_API_KEY?.trim()
  if (!apiKey) throw new Error('WIX_API_KEY must be set')

  const client = createClient({
    auth: OAuthStrategy({
      clientId: process.env.NEXT_PUBLIC_WIX_CLIENT_ID!,
    }),
  })
  const visitorTokens = await client.auth.generateVisitorTokens()
  client.auth.setTokens(visitorTokens)
  const tokens = await client.auth.getMemberTokensForExternalLogin(
    memberId,
    apiKey,
  )
  if (!tokens?.accessToken?.value || !tokens?.refreshToken?.value) {
    throw new Error('Could not issue member tokens')
  }
  return tokens
}
