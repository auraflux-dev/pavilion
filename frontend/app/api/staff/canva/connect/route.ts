import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  canvaClientConfigured,
  canvaRedirectBase,
  canvaRedirectUri,
} from '@/lib/canva/config'
import { buildCanvaAuthorizeUrl, makeOAuthState, makePkce } from '@/lib/canva/oauth'

const COOKIE = 'canva_oauth'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !requireStaffRole(session.staff, ['marketing', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!canvaClientConfigured()) {
    return NextResponse.json(
      {
        error:
          'Canva Connect is not configured. Set CANVA_CLIENT_ID and CANVA_CLIENT_SECRET (from CWN / Canva Developer Portal).',
      },
      { status: 503 },
    )
  }

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const base = canvaRedirectBase(host)
  const redirectUri = canvaRedirectUri(base)
  const { verifier, challenge } = makePkce()
  const state = makeOAuthState()
  const url = buildCanvaAuthorizeUrl({ redirectUri, challenge, state })

  const payload = Buffer.from(
    JSON.stringify({
      verifier,
      state,
      email: session.email,
      redirectUri,
    }),
    'utf8',
  ).toString('base64url')

  const res = NextResponse.redirect(url)
  res.cookies.set(COOKIE, payload, {
    httpOnly: true,
    secure: !base.includes('localhost'),
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}
