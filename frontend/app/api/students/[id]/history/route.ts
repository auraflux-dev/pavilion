/**
 * GET /api/students/[id]/history
 * Returns enrollments + payments for a specific student.
 * Validates the student belongs to the logged-in parent before returning.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient } from '@/lib/wix-oauth-client'
import { getWixClient } from '@/lib/wix-client'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'

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

    // Verify student belongs to this parent
    const studentRes = await adminClient.items.get('Students', id)
    const student = studentRes as any
    if (!student || student.archived === true || student.parentEmail !== email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const [enrollRes, payRes] = await Promise.allSettled([
      adminClient.items.query('Enrollments').eq('studentId', id).descending('registrationDate').find(),
      adminClient.items.query('Payments').eq('studentId', id).descending('paymentDate').find(),
    ])

    const enrollments = enrollRes.status === 'fulfilled'
      ? (enrollRes.value.items ?? []).map((item: any) => ({
          id: item._id,
          programName: item.programName ?? '',
          status: item.status ?? '',
          registrationDate: item.registrationDate ?? null,
          paymentAmount: item.paymentAmount ?? 0,
          grade: item.grade ?? '',
        }))
      : []

    const payments = payRes.status === 'fulfilled'
      ? (payRes.value.items ?? []).map((item: any) => ({
          id: item._id,
          programName: item.programName ?? '',
          amount: item.amount ?? 0,
          status: item.status ?? '',
          paymentDate: item.paymentDate ?? null,
          paymentMethod: item.paymentMethod ?? '',
          transactionId: item.transactionId ?? '',
        }))
      : []

    return NextResponse.json({ enrollments, payments })
  } catch (err) {
    console.error('/api/students/[id]/history error:', err)
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 })
  }
}
