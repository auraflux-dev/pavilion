/**
 * POST /api/cron/grant-board-seat
 * Auth: Bearer $CRON_SECRET or $PURCHASE_RESEND_SECRET
 * Body: {
 *   staffEmail?: string,           // e.g. initiatives-coordinator@shmspto.org
 *   parentEmail?: string,          // personal email if StaffRoles link missing
 *   displayName?: string,
 *   dryRun?: boolean
 * }
 * Grants complimentary Reef + Fall/Spring BRD75 codes on the personal email.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { grantBoardSeatBenefits } from '@/lib/staff/board-seat-benefits'
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
      staffEmail?: string
      parentEmail?: string
      displayName?: string
      dryRun?: boolean
    }
    const staffEmail = String(body.staffEmail || '')
      .trim()
      .toLowerCase()
    let parentEmail = String(body.parentEmail || '')
      .trim()
      .toLowerCase()
    let displayName = String(body.displayName || '').trim()
    const dryRun = Boolean(body.dryRun)

    const client = getWixClient()
    let staffRow: Record<string, unknown> | null = null
    if (staffEmail) {
      const found = await client.items
        .query('StaffRoles')
        .eq('email', staffEmail)
        .limit(1)
        .find()
      staffRow = (found.items?.[0] as Record<string, unknown>) || null
      if (!parentEmail) {
        parentEmail = String(staffRow?.personalEmail ?? '')
          .trim()
          .toLowerCase()
      }
      if (!displayName) {
        displayName = String(staffRow?.name || staffRow?.boardTitle || '').trim()
      }
    }

    if (!parentEmail || !parentEmail.includes('@') || parentEmail.endsWith('@shmspto.org')) {
      return NextResponse.json(
        {
          error:
            'Need a personal parent email (not @shmspto.org). Link personalEmail on StaffRoles or pass parentEmail.',
          staffEmail: staffEmail || null,
          staffFound: Boolean(staffRow),
          personalEmailOnStaff: staffRow
            ? String(staffRow.personalEmail ?? '').trim().toLowerCase() || null
            : null,
        },
        { status: 400 },
      )
    }

    const mem = await client.items
      .query('Memberships')
      .eq('email', parentEmail)
      .limit(1)
      .find()
    const memRow = (mem.items?.[0] as Record<string, unknown>) || null
    const before = memRow
      ? {
          tier: memRow.tier,
          status: memRow.status,
          boardDiscountFallCode: memRow.boardDiscountFallCode || null,
          boardDiscountSpringCode: memRow.boardDiscountSpringCode || null,
          enrichmentCode: memRow.enrichmentCode || null,
        }
      : null

    const students = await client.items
      .query('Students')
      .eq('parentEmail', parentEmail)
      .limit(20)
      .find()
    const studentTiers = (students.items ?? []).map((s) => ({
      name: `${(s as { firstName?: string }).firstName || ''} ${(s as { lastName?: string }).lastName || ''}`.trim(),
      tier: (s as { membershipTier?: string }).membershipTier,
    }))

    const preview = {
      staffEmail: staffEmail || null,
      parentEmail,
      displayName: displayName || parentEmail,
      before,
      studentTiers,
    }

    if (dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, preview })
    }

    const granted = await grantBoardSeatBenefits({
      parentEmail,
      displayName: displayName || parentEmail,
      staffEmail: staffEmail || 'board',
    })

    return NextResponse.json({
      ok: true,
      preview,
      granted: {
        parentEmail: granted.parentEmail,
        tier: granted.tier,
        fallCode: granted.fallCode,
        springCode: granted.springCode,
        membershipUpserted: granted.membershipUpserted,
      },
    })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/cron/grant-board-seat' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Grant failed', eventId },
      { status: 500 },
    )
  }
}
