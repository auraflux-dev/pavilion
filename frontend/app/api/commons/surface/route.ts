import { NextRequest, NextResponse } from 'next/server'
import { liveCommerceGate } from '@/lib/crm/commerce-gate'
import {
  COMMONS_COMMERCE_GATED_WORKSPACES,
  COMMONS_DEMO_HIDDEN_WORKSPACES,
  filterSurfaceWorkspaces,
} from '@/lib/demo/commons-surface'
import { isDemoInstanceFromRequest } from '@/lib/demo/instance'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const gate = await liveCommerceGate(req)
  const demo = isDemoInstanceFromRequest(req)
  const hiddenStaffWorkspaces = filterSurfaceWorkspaces(
    demo ? COMMONS_DEMO_HIDDEN_WORKSPACES : gate.liveCommerce ? [] : COMMONS_COMMERCE_GATED_WORKSPACES,
  )
  return NextResponse.json({
    liveCommerce: gate.liveCommerce,
    reason: gate.reason,
    note: gate.note,
    hiddenStaffWorkspaces,
    demo,
  })
}
