/**
 * POST /api/auth/logout
 * Clears the tokens cookie. Client redirects to Wix logout URL separately.
 */
import { NextResponse } from 'next/server'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { DEMO_REVIEW_COOKIE } from '@/lib/demo/cookie'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(TOKENS_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  })
  res.cookies.set(DEMO_REVIEW_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  })
  return res
}
