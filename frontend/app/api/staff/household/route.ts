/**
 * GET /api/staff/household?account=A10050
 * GET /api/staff/household?email=parent@example.com
 *
 * Account-first household card for Staff Programs / Payments.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRoleOrWorkspace } from '@/lib/staff/session'
import {
  loadHouseholdActivity,
  openHousehold,
} from '@/lib/staff/household-activity'
import { normalizeAccountNumber } from '@/lib/staff/membership-account-number'

export const dynamic = 'force-dynamic'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (
    !requireStaffRoleOrWorkspace(
      session?.staff ?? null,
      ['treasurer', 'admin'],
      ['payments', 'programs', 'membership'],
    )
  ) {
    return null
  }
  return session
}

export async function GET(req: NextRequest) {
  if (!(await gate(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sp = req.nextUrl.searchParams
  const account = sp.get('account')?.trim() || sp.get('accountNumber')?.trim() || ''
  const email = sp.get('email')?.trim() || ''

  if (!account && !email) {
    return NextResponse.json(
      { error: 'Pass account=A##### or email=' },
      { status: 400 },
    )
  }

  try {
    const household = await openHousehold({
      accountNumber: account,
      email,
    })
    if (!household?.accountNumber) {
      return NextResponse.json(
        {
          error: normalizeAccountNumber(account)
            ? 'No household for that account number'
            : 'No household for that email',
        },
        { status: 404 },
      )
    }

    const activity = await loadHouseholdActivity(household)
    const activeEnrollments = activity.enrollments.filter((e) => e.active)

    return NextResponse.json({
      ok: true,
      account: {
        accountNumber: household.accountNumber,
        emails: household.emails,
        primaryEmail: household.primaryEmail,
        tiers: [...new Set(household.tierCandidates.map((t) => String(t || '').trim()).filter(Boolean))],
        students: household.students.map((s) => ({
          id: String(s._id || ''),
          firstName: String(s.firstName || ''),
          lastName: String(s.lastName || ''),
          grade: String((s as { grade?: string }).grade || ''),
        })),
      },
      enrollments: activity.enrollments,
      payments: activity.payments,
      summary: {
        activeSeats: activeEnrollments.length,
        paymentRows: activity.payments.length,
        paymentSum: Math.round(
          activity.payments
            .filter((p) => /paid|completed/i.test(p.status) || !p.status)
            .reduce((s, p) => s + p.amount, 0) * 100,
        ) / 100,
      },
    })
  } catch (err) {
    console.error('/api/staff/household GET', err)
    return NextResponse.json({ error: 'Could not load household' }, { status: 500 })
  }
}
