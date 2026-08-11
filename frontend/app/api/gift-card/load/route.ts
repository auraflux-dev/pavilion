/**
 * POST /api/gift-card/load
 * Parent manually loads funds onto their student's gift card.
 * Body: { studentId, amountCents }
 * Payment is handled by Wix Payments. this route is called after payment succeeds.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { loadGiftCard } from '@/lib/square'
import { randomUUID } from 'crypto'
import { getEffectiveParentEmail } from '@/lib/staff/session'
import { canViewerAccessStudent } from '@/lib/family-guardians'

export async function POST(req: NextRequest) {
  try {
    const effective = await getEffectiveParentEmail(req)
    if (!effective?.parentEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const email = effective.parentEmail

    const { studentId, amountCents } = await req.json()
    if (!studentId || !amountCents || amountCents < 100) {
      return NextResponse.json({ error: 'studentId and amountCents (min 100) required' }, { status: 400 })
    }

    const adminClient = getWixClient()
    const student = (await adminClient.items.get('Students', studentId)) as {
      parentEmail?: string
      archived?: boolean
      squareGiftCardGan?: string
    }
    if (!(await canViewerAccessStudent(email, student))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!student.squareGiftCardGan) {
      return NextResponse.json({ error: 'No gift card on file for this student' }, { status: 400 })
    }

    const idempotencyKey = randomUUID()
    const activity = await loadGiftCard(student.squareGiftCardGan, amountCents, idempotencyKey)

    return NextResponse.json({
      ok: true,
      newBalance: activity?.giftCardBalanceMoney
        ? Number(activity.giftCardBalanceMoney.amount) / 100
        : null,
    })
  } catch (err: any) {
    console.error('/api/gift-card/load error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to load gift card' }, { status: 500 })
  }
}
