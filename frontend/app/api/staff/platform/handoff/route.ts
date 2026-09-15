import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  PLATFORM_CMS_ORG_COOKIE,
  isPlatformOwnerEmail,
  listCustomerOrganizations,
} from '@/lib/crm/platform-owners'
import { isDemoInstanceFromRequest } from '@/lib/demo/instance'
import { isSecure } from '@/lib/auth-cookies'
import { requireOrganizationId } from '@/lib/crm/tenant'
import { PLATFORM_MODE_COOKIE } from '@/lib/crm/platform-mode'
import { resolveFleetProductFromRequest } from '@/lib/crm/fleet-product'

/**
 * Set client-Staff cookies on the **current** host (customer domain), then land on /staff.
 * Brand Staff should send operators here after resolving tempHost/customDomain.
 */
export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !requireStaffRole(session.staff, 'admin')) {
    return NextResponse.redirect(new URL('/staff', req.url))
  }
  const demo = isDemoInstanceFromRequest(req)
  const email = String(session.staff.email || session.email || '').trim().toLowerCase()
  if (!demo && !(await isPlatformOwnerEmail(email, { demo }))) {
    return NextResponse.redirect(new URL('/staff', req.url))
  }

  const organizationId = requireOrganizationId(
    req.nextUrl.searchParams.get('organizationId') || '',
  )
  const product = resolveFleetProductFromRequest(req, email, { demo })
  const orgs = await listCustomerOrganizations({
    demo,
    product,
    includePlatformHome: false,
  })
  const target = orgs.find((o) => o.id === organizationId)
  if (!target || target.plan === 'platform') {
    return NextResponse.json({ error: 'Unknown organization' }, { status: 400 })
  }

  const view = (req.nextUrl.searchParams.get('view') || 'home').trim() || 'home'
  const dest = new URL('/staff', req.url)
  dest.searchParams.set('view', view)

  const res = NextResponse.redirect(dest)
  res.cookies.set(PLATFORM_MODE_COOKIE, 'client', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(),
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  res.cookies.set(PLATFORM_CMS_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(),
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
