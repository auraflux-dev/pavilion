/**
 * GET  /api/staff/cove/store-pickups — today's window Cove product payments
 * PATCH { id, action: 'handed_out' | 'undo' }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  listTodayStorePickups,
  markStorePickupHandedOut,
} from '@/lib/staff/store-pickups'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['retail', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const includeHandedOut = req.nextUrl.searchParams.get('handed') !== '0'
    const data = await listTodayStorePickups({ includeHandedOut })
    return NextResponse.json({
      ok: true,
      ...data,
      pendingCount: data.items.filter((i) => !i.handedOut).length,
    })
  } catch (err) {
    console.error('store-pickups GET', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load pickups' },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['retail', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const id = String(body.id ?? '').trim()
    const action = String(body.action ?? 'handed_out').trim()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    if (action !== 'handed_out' && action !== 'undo') {
      return NextResponse.json({ error: 'action must be handed_out or undo' }, { status: 400 })
    }
    const item = await markStorePickupHandedOut(id, action)
    return NextResponse.json({ ok: true, item })
  } catch (err) {
    const status =
      typeof (err as { status?: number })?.status === 'number'
        ? (err as { status: number }).status
        : 500
    console.error('store-pickups PATCH', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not update pickup' },
      { status },
    )
  }
}
