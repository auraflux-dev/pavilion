/**
 * POST /api/cron/topup-membership-cove-credit
 * Auth: Authorization: Bearer $CRON_SECRET or $PURCHASE_RESEND_SECRET
 * Body: { parentEmail, tier? } — loads missing membership Cove credit up to tier entitlement.
 * Unused Square balance already rolls over; this only adds what was never loaded.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  applyPaidMembership,
  sumLoadedMembershipCoveCreditBase,
} from '@/lib/membership-sync'
import { reportError } from '@/lib/observability/error-reporting'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorize(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || ''
  const secrets = [process.env.CRON_SECRET, process.env.PURCHASE_RESEND_SECRET]
    .map((s) => s?.trim())
    .filter(Boolean) as string[]
  return secrets.some((secret) => auth === `Bearer ${secret}`)
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      parentEmail?: string
      tier?: string
    }
    const parentEmail = String(body.parentEmail || '')
      .trim()
      .toLowerCase()
    const tierRaw = String(body.tier || 'tide')
      .trim()
      .toLowerCase()
    const tier =
      tierRaw === 'reef' || tierRaw === 'lagoon' || tierRaw === 'tide'
        ? tierRaw
        : null
    if (!parentEmail || !parentEmail.includes('@')) {
      return NextResponse.json({ error: 'parentEmail required' }, { status: 400 })
    }
    if (!tier) {
      return NextResponse.json({ error: 'tier must be reef|lagoon|tide' }, { status: 400 })
    }

    const before = await sumLoadedMembershipCoveCreditBase(parentEmail)
    const orderId = `ops-cove-topup-${tier}-${parentEmail.slice(0, 24)}-${Date.now()}`
    const result = await applyPaidMembership({
      parentEmail,
      tier,
      orderId,
    })

    return NextResponse.json({
      ok: true,
      parentEmail,
      tier,
      alreadyLoadedBaseBefore: before,
      giftCard: result.giftCard ?? null,
      updatedStudentIds: result.updatedStudentIds,
    })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/cron/topup-membership-cove-credit' })
    return NextResponse.json({ error: 'Top-up failed', eventId }, { status: 500 })
  }
}
