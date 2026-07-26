/**
 * GET /api/staff/membership/fulfillments. pending shirt/magnet queue
 * PATCH /api/staff/membership/fulfillments. mark one entitlement fulfilled
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
 listPendingFulfillments,
 markEntitlementFulfilled,
} from '@/lib/staff/membership-fulfillment'
import type { MembershipEntitlementKind } from '@/lib/membership-entitlements'

export const dynamic = 'force-dynamic'

function gate(req: NextRequest) {
 return getStaffSession(req).then((session) => {
 if (!requireStaffRole(session?.staff ?? null, ['membership', 'retail', 'admin', 'secretary'])) {
 return null
 }
 return session
 })
}

export async function GET(req: NextRequest) {
 const session = await gate(req)
 if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 try {
 const items = await listPendingFulfillments()
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
 if (!membershipId || !['spirit_shirt', 'magnet'].includes(kind)) {
 return NextResponse.json({ error: 'membershipId and kind (spirit_shirt|magnet) required' }, { status: 400 })
 }
 const entitlements = await markEntitlementFulfilled({
 membershipId,
 kind,
 fulfilledByEmail: session.email,
 note: String(body.note ?? ''),
 })
 return NextResponse.json({ ok: true, entitlements })
 } catch (err) {
 console.error('fulfillments PATCH', err)
 return NextResponse.json(
 { error: err instanceof Error ? err.message : 'Could not update' },
 { status: 400 },
 )
 }
}
