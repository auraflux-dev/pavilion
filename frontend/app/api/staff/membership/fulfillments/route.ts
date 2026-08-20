/**
 * GET /api/staff/membership/fulfillments. open shirt/magnet queue (pending + ordered)
 * PATCH. action: ordered | picked_up (default picked_up for backward compat)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  listOpenFulfillments,
  updateEntitlementFulfillment,
  type FulfillmentAction,
} from '@/lib/staff/membership-fulfillment'
import type { MembershipEntitlementKind } from '@/lib/membership-entitlements'

export const dynamic = 'force-dynamic'

function gate(req: NextRequest) {
  return getStaffSession(req).then((session) => {
    if (
      !requireStaffRole(session?.staff ?? null, ['membership', 'retail', 'admin', 'secretary'])
    ) {
      return null
    }
    return session
  })
}

export async function GET(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const items = await listOpenFulfillments()
    return NextResponse.json({ items, count: items.length })
  } catch (err) {
    console.error('fulfillments GET', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load fulfillments' },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const membershipId = String(body.membershipId ?? '').trim()
    const kind = String(body.kind ?? '').trim() as MembershipEntitlementKind
    const rawAction = String(body.action ?? body.status ?? 'picked_up')
      .trim()
      .toLowerCase()
    const action: FulfillmentAction =
      rawAction === 'ordered' || rawAction === 'order'
        ? 'ordered'
        : rawAction === 'picked_up' ||
            rawAction === 'pickup' ||
            rawAction === 'fulfilled' ||
            rawAction === 'fulfill'
          ? 'picked_up'
          : 'picked_up'

    if (!membershipId || !['spirit_shirt', 'magnet'].includes(kind)) {
      return NextResponse.json(
        { error: 'membershipId and kind (spirit_shirt|magnet) required' },
        { status: 400 },
      )
    }
    const entitlements = await updateEntitlementFulfillment({
      membershipId,
      kind,
      action,
      byEmail: session.email,
      note: String(body.note ?? ''),
    })
    return NextResponse.json({ ok: true, action, entitlements })
  } catch (err) {
    console.error('fulfillments PATCH', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not update' },
      { status: 400 },
    )
  }
}
