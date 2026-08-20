/**
 * GET /api/commons/square/oauth/start. send treasurer to Square OAuth (this school's seller).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'
import { isSameOriginRequest } from '@/lib/security/csrf'
import { MissingOrganizationIdError, organizationIdFromRequest } from '@/lib/crm/tenant'
import { squareAuthorizeUrl, squareOAuthConfigured } from '@/lib/crm/square-oauth'
import { isDemoInstance } from '@/lib/demo/instance'
import { commonsDbEnabled } from '@/lib/crm/db'
import { ensureCommonsReady } from '@/lib/crm/migrate'

export const dynamic = 'force-dynamic'

function stateFor(orgId: string): string {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.DEMO_SIGNING_SECRET || ''
  const sig = createHmac('sha256', secret).update(orgId).digest('hex').slice(0, 24)
  return `${orgId}.${sig}`
}

export async function GET(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!commonsDbEnabled()) {
    return NextResponse.json({ error: 'Commons database is not configured' }, { status: 503 })
  }
  if (!squareOAuthConfigured()) {
    return NextResponse.json(
      { error: 'Set SQUARE_APPLICATION_ID and SQUARE_APPLICATION_SECRET on this Commons project.' },
      { status: 503 },
    )
  }
  try {
    await ensureCommonsReady()
    const orgId = await organizationIdFromRequest(req)
    const url = squareAuthorizeUrl(stateFor(orgId))
    if (isDemoInstance() && req.nextUrl.searchParams.get('json') === '1') {
      return NextResponse.json({ ok: true, url })
    }
    return NextResponse.redirect(url)
  } catch (err) {
    if (err instanceof MissingOrganizationIdError) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Could not start Square OAuth' }, { status: 500 })
  }
}
