/**
 * GET /api/students/[id]/history
 * Returns enrollments + payments for a specific student.
 * Validates the student belongs to the logged-in parent before returning.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient } from '@/lib/wix-oauth-client'
import { getWixClient } from '@/lib/wix-client'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { listEnrollmentsForStudent } from '@/lib/programs/enrollments'
import { normalizePaymentLedgerRow } from '@/lib/payment-ledger'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tokensCookie = req.cookies.get(TOKENS_COOKIE)?.value
  if (!tokensCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tokens = JSON.parse(tokensCookie)
    const oauthClient = createOAuthClient(tokens)
    const { member } = await oauthClient.members.getCurrentMember({ fieldsets: ['FULL'] })
    const email = member?.loginEmail ?? ''
    if (!email) return NextResponse.json({ error: 'No email' }, { status: 400 })

    const adminClient = getWixClient()

    const studentRes = await adminClient.items.get('Students', id)
    const student = studentRes as { parentEmail?: string; archived?: boolean }
    const { canViewerAccessStudent } = await import('@/lib/family-guardians')
    if (!student || !(await canViewerAccessStudent(email, student))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { getAllPrograms } = await import('@/lib/api/programs')
    const [enrollments, payRes, programs] = await Promise.all([
      listEnrollmentsForStudent(id),
      adminClient.items.query('Payments').eq('studentId', id).descending('paymentDate').find(),
      getAllPrograms().catch(() => []),
    ])

    const PAST_STATUSES = new Set(['historical', 'cancelled'])
    const mappedEnrollments = enrollments.map((item) => ({
      id: item._id,
      programName: item.programName ?? '',
      programId: item.programId ?? '',
      status: item.status ?? '',
      registrationDate: item.enrolledAt ?? item.registrationDate ?? null,
      paymentAmount: item.feePaid ?? item.paymentAmount ?? 0,
      waitlistPosition: item.waitlistPosition ?? null,
    }))
    const currentEnrollments = mappedEnrollments.filter(
      (e) => !PAST_STATUSES.has(String(e.status).toLowerCase()),
    )
    const pastEnrollments = mappedEnrollments.filter((e) =>
      PAST_STATUSES.has(String(e.status).toLowerCase()),
    )

    const payments = (payRes.items ?? []).map((item: Record<string, unknown>) => {
      const norm = normalizePaymentLedgerRow(item)
      return {
        id: item._id,
        programName: norm.programName,
        amount: norm.amount,
        status: norm.status,
        paymentDate: norm.paymentDate,
        paymentMethod: norm.paymentMethod,
        detail: norm.detail ?? '',
        transactionId: item.transactionId ?? '',
      }
    })

    const transferOptions = programs
      .filter((p) => p.registrationOpen !== false)
      .map((p) => ({
        id: p._id,
        name: p.name,
      }))
      .filter((p) => p.id && p.name)

    return NextResponse.json({
      enrollments: currentEnrollments,
      pastEnrollments,
      payments,
      transferOptions,
    })
  } catch (err) {
    console.error('/api/students/[id]/history error:', err)
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 })
  }
}
