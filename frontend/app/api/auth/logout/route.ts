/**
 * POST /api/auth/logout
 * Clears the tokens cookie. Client redirects to Wix logout URL separately.
 */
import { NextRequest, NextResponse } from 'next/server'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { DEMO_REVIEW_COOKIE } from '@/lib/demo/cookie'
import { organizationIdFromRequest } from '@/lib/crm/tenant'
import {
  ACTIVITY_CORRELATION_COOKIE,
  classifyUserAgent,
  clientIpFromHeaders,
  writePlatformActivity,
} from '@/lib/ops/platform-activity'

export async function POST(req: NextRequest) {
  const hadSession = Boolean(
    req.cookies.get(TOKENS_COOKIE)?.value || req.cookies.get(DEMO_REVIEW_COOKIE)?.value,
  )
  if (hadSession) {
    let organizationId: string | undefined
    try {
      organizationId = await organizationIdFromRequest(req)
    } catch {
      organizationId = undefined
    }
    void writePlatformActivity({
      category: 'auth',
      action: 'logout',
      actorKind: 'member',
      method: 'session',
      outcome: 'ok',
      route: '/api/auth/logout',
      ip: clientIpFromHeaders(req),
      userAgentClass: classifyUserAgent(req.headers.get('user-agent') || ''),
      correlationId: req.cookies.get(ACTIVITY_CORRELATION_COOKIE)?.value || '',
      detail: 'session_cleared',
      organizationId,
    })
  }

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
