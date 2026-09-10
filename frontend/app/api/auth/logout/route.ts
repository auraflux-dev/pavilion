/**
 * POST /api/auth/logout
 * Clears the tokens cookie. Client redirects to Wix logout URL separately.
 */
import { NextRequest, NextResponse } from 'next/server'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { DEMO_REVIEW_COOKIE } from '@/lib/demo/cookie'
import { FLEET_PRODUCT_COOKIE } from '@/lib/crm/fleet-product'
import { PLATFORM_CMS_ORG_COOKIE } from '@/lib/crm/platform-owners'
import { PLATFORM_MODE_COOKIE } from '@/lib/crm/platform-mode'
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
  const clear = (name: string) => {
    res.cookies.set(name, '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
    })
  }
  clear(TOKENS_COOKIE)
  clear(DEMO_REVIEW_COOKIE)
  clear(PLATFORM_MODE_COOKIE)
  clear(PLATFORM_CMS_ORG_COOKIE)
  clear(FLEET_PRODUCT_COOKIE)
  return res
}
