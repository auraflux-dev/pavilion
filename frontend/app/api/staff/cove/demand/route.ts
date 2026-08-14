/**
 * GET   /api/staff/cove/demand — list demand + size rollup
 * POST  /api/staff/cove/demand — log OOS size interest (events/membership/retail/admin)
 * PATCH /api/staff/cove/demand — mark ordered / fulfilled / cancelled (retail/admin)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  createSpiritWearDemand,
  listSpiritWearDemand,
  rollupOpenDemand,
  setSpiritWearDemandStatus,
  type SpiritDemandStatus,
} from '@/lib/staff/spirit-wear-demand'
import { reportError } from '@/lib/observability/error-reporting'

export const dynamic = 'force-dynamic'

function canLogDemand(session: Awaited<ReturnType<typeof getStaffSession>>) {
  return Boolean(
    session?.staff &&
      requireStaffRole(session.staff, ['retail', 'events', 'membership', 'admin']),
  )
}

function canManageDemand(session: Awaited<ReturnType<typeof getStaffSession>>) {
  return Boolean(session?.staff && requireStaffRole(session.staff, ['retail', 'admin']))
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!canLogDemand(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const statusParam = String(req.nextUrl.searchParams.get('status') ?? 'open').toLowerCase()
    const status =
      statusParam === 'all' ||
      statusParam === 'open' ||
      statusParam === 'ordered' ||
      statusParam === 'fulfilled' ||
      statusParam === 'cancelled'
        ? (statusParam as SpiritDemandStatus | 'all')
        : 'open'
    const items = await listSpiritWearDemand({ status })
    const openItems =
      status === 'open' ? items : await listSpiritWearDemand({ status: 'open' })
    return NextResponse.json({
      items,
      rollup: rollupOpenDemand(openItems),
      openCount: openItems.length,
      canManage: canManageDemand(session),
    })
  } catch (err) {
    console.error('cove/demand GET', err)
    const eventId = await reportError(err, { route: '/api/staff/cove/demand' })
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to list demand (create SpiritWearDemand CMS collection if missing)',
        eventId,
      },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!canLogDemand(session) || !session?.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const created = await createSpiritWearDemand({
      parentName: String(body.parentName ?? ''),
      parentEmail: String(body.parentEmail ?? ''),
      parentPhone: String(body.parentPhone ?? ''),
      coveFamilyCode: String(body.coveFamilyCode ?? ''),
      productId: String(body.productId ?? ''),
      productName: String(body.productName ?? ''),
      variantId: String(body.variantId ?? ''),
      sizeLabel: String(body.sizeLabel ?? ''),
      sku: String(body.sku ?? ''),
      qty: Number(body.qty) || 1,
      eventNote: String(body.eventNote ?? ''),
      notes: String(body.notes ?? ''),
      source: String(body.source ?? 'register'),
      createdByEmail: session.email,
    })
    return NextResponse.json({ ok: true, item: created })
  } catch (err) {
    console.error('cove/demand POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to log demand' },
      { status: 400 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!canManageDemand(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const id = String(body.id ?? '').trim()
    const status = String(body.status ?? '').toLowerCase() as SpiritDemandStatus
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const updated = await setSpiritWearDemandStatus(id, status)
    return NextResponse.json({ ok: true, item: updated })
  } catch (err) {
    console.error('cove/demand PATCH', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update demand' },
      { status: 400 },
    )
  }
}
