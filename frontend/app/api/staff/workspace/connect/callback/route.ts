import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/staff/session'
import { upsertStaffRefreshToken } from '@/lib/google/workspace-auth'

/** Must match the redirect_uri used when starting OAuth (and Google Console). */
function redirectBase(req: NextRequest) {
  const fixed = process.env.GOOGLE_OAUTH_REDIRECT_BASE?.replace(/\/$/, '')
  if (fixed) return fixed

  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
  if (host.includes('localhost') || host.startsWith('127.0.0.1')) {
    return `http://${host}`
  }
  if (host.endsWith('.vercel.app') || host === 'shmspto.vercel.app') {
    return `https://${host}`
  }
  return 'https://shmspto.vercel.app'
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  const base = redirectBase(req)
  const fail = (msg: string) =>
    NextResponse.redirect(
      `${base}/staff?view=inbox&googleError=${encodeURIComponent(msg)}`,
    )

  if (!session) return fail('Sign in with your @shmspto.org staff account first.')

  const err = req.nextUrl.searchParams.get('error')
  if (err) return fail(err)

  const code = req.nextUrl.searchParams.get('code')
  const stateRaw = req.nextUrl.searchParams.get('state')
  if (!code || !stateRaw) return fail('Missing OAuth code')

  try {
    const state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8')) as {
      email?: string
    }
    if (state.email && state.email.toLowerCase() !== session.email.toLowerCase()) {
      return fail('Google account must match your staff login email.')
    }
  } catch {
    return fail('Invalid OAuth state')
  }

  const clientId =
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || process.env.GMAIL_CLIENT_ID?.trim()
  const clientSecret =
    process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || process.env.GMAIL_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return fail('OAuth client not configured')

  const redirectUri = `${base}/api/staff/workspace/connect/callback`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const tokens = (await tokenRes.json()) as {
    refresh_token?: string
    error?: string
    error_description?: string
  }
  if (!tokenRes.ok || !tokens.refresh_token) {
    return fail(
      tokens.error_description ||
        tokens.error ||
        'No refresh token — revoke prior access and try Connect again.',
    )
  }

  try {
    await upsertStaffRefreshToken(session.email, tokens.refresh_token)
  } catch (e) {
    console.error('StaffGoogleTokens upsert failed', e)
    return fail(
      'Connected to Google but could not save token. Create CMS collection StaffGoogleTokens (email, refreshToken, active).',
    )
  }

  return NextResponse.redirect(`${base}/staff?view=inbox&google=connected`)
}
