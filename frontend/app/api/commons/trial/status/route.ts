import { NextRequest, NextResponse } from 'next/server'
import { commonsDbEnabled } from '@/lib/crm/db'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { getOrgBilling, holdEndsAt, writesAllowed } from '@/lib/crm/org-plan'
import { MissingOrganizationIdError, organizationIdFromRequest } from '@/lib/crm/tenant'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!commonsDbEnabled()) {
    return NextResponse.json({ configured: false })
  }
  try {
    await ensureCommonsReady()
    const orgId = await organizationIdFromRequest(req)
    const org = await getOrgBilling(orgId)
    if (!org) return NextResponse.json({ configured: false })
    return NextResponse.json({
      configured: true,
      ...org,
      writesAllowed: writesAllowed(org.plan, org.trialEndsAt),
      holdEndsAt: holdEndsAt(org.trialEndsAt)?.toISOString() ?? null,
    })
  } catch (err) {
    if (err instanceof MissingOrganizationIdError) {
      return NextResponse.json({ configured: false })
    }
    return NextResponse.json({ error: 'Could not load trial status' }, { status: 500 })
  }
}
