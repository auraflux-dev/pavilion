/**
 * POST /api/auth/set-tokens
 * Receives member tokens from the callback page and stores them
 * in a secure httpOnly cookie. Never exposed to client JS.
 */
import { NextRequest, NextResponse } from 'next/server'
import { TOKENS_COOKIE, TOKEN_MAX_AGE, isSecure } from '@/lib/auth-cookies'

export async function POST(req: NextRequest) {
  try {
    const { tokens } = await req.json()
    if (!tokens?.accessToken?.value || !tokens?.refreshToken?.value) {
      return NextResponse.json({ error: 'Invalid tokens' }, { status: 400 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(TOKENS_COOKIE, JSON.stringify(tokens), {
      httpOnly: true,
      secure: isSecure(),
      sameSite: 'lax',
      maxAge: TOKEN_MAX_AGE,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Failed to set tokens' }, { status: 500 })
  }
}
