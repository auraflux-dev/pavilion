import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/staff/session'
import {
  ALL_WORKSPACE_SCOPES,
  upsertStaffRefreshToken,
  workspaceOauthClientConfigured,
  workspaceServiceAccountConfigured,
} from '@/lib/google/workspace-auth'

/** Must match Authorized redirect URIs on the Google Web OAuth client exactly. */
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
  // Prefer the host the staffer is actually on when it's our Vercel app
  if (host.endsWith('.vercel.app') || host === 'shmspto.vercel.app') {
    return `https://${host}`
  }
  // .org may still hit Wix — never use it for Google OAuth until DNS points here
  return 'https://shmspto.vercel.app'
}

/** Start Google OAuth for this staffer (when domain-wide delegation is not used). */
export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  if (workspaceServiceAccountConfigured()) {
    return NextResponse.json({
      ok: true,
      mode: 'delegation',
      message: 'Domain-wide delegation is active — no Connect step needed.',
    })
  }

  if (!workspaceOauthClientConfigured() && !process.env.GMAIL_CLIENT_ID) {
    return NextResponse.json(
      { error: 'Google OAuth client is not configured on the server.' },
      { status: 503 },
    )
  }

  const clientId =
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || process.env.GMAIL_CLIENT_ID?.trim() || ''
  const base = redirectBase(req)
  const redirectUri = `${base}/api/staff/workspace/connect/callback`
  const state = Buffer.from(
    JSON.stringify({ email: session.email, t: Date.now() }),
    'utf8',
  ).toString('base64url')

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', ALL_WORKSPACE_SCOPES.join(' '))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('login_hint', session.email)
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString())
}

export async function POST(req: NextRequest) {
  // Used by callback internally via form; keep GET as the staff entrypoint
  return GET(req)
}
