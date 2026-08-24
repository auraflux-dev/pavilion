/**
 * POST /api/staff/members/account-numbers/setup
 * President: ensure Memberships.accountNumber field + backfill missing numbers.
 * Returns counts only (no PII).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { backfillMembershipAccountNumbers } from '@/lib/staff/membership-account-number'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['admin'])) {
    return NextResponse.json({ error: 'President only' }, { status: 403 })
  }

  try {
    const result = await backfillMembershipAccountNumbers()
    return NextResponse.json({
      ok: true,
      ...result,
      message:
        result.assigned > 0
          ? `Assigned ${result.assigned} account number(s). ${result.already} already had one.`
          : result.fieldCreated.length > 0
            ? 'Account number field added. All existing rows already numbered.'
            : `All ${result.already} memberships already have account numbers.`,
    })
  } catch (err) {
    console.error('/api/staff/members/account-numbers/setup', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Setup failed' },
      { status: 500 },
    )
  }
}
