import { NextRequest, NextResponse } from 'next/server'
import { commonsDbEnabled } from '@/lib/crm/db'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { getOrgSyncState } from '@/lib/crm/sync-state'
import { MissingOrganizationIdError, organizationIdFromRequest } from '@/lib/crm/tenant'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!commonsDbEnabled()) {
    return NextResponse.json({ configured: false })
  }
  try {
    await ensureCommonsReady()
    const orgId = await organizationIdFromRequest(req)
    const state = await getOrgSyncState(orgId)
    return NextResponse.json({ configured: true, ...state })
  } catch (err) {
    if (err instanceof MissingOrganizationIdError) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Could not load sync state' }, { status: 500 })
  }
}
