/**
 * GET /api/gift-card/balance?studentId=xxx
 * Returns live Square balance + recent activity for a student's gift card.
 * Validates the student belongs to the logged-in parent.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getGiftCardBalance, getGiftCardActivities } from '@/lib/square'
import { getEffectiveParentEmail } from '@/lib/staff/session'
import { canViewerAccessStudent } from '@/lib/family-guardians'

export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get('studentId')
  if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

  try {
    const effective = await getEffectiveParentEmail(req)
    if (!effective) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const email = effective.parentEmail

    const adminClient = getWixClient()
    const student = (await adminClient.items.get('Students', studentId)) as {
      parentEmail?: string
      archived?: boolean
      squareGiftCardGan?: string
      squareGiftCardId?: string
    }
    if (!(await canViewerAccessStudent(email, student))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const gan = student.squareGiftCardGan
    const squareCardId = student.squareGiftCardId

    if (!gan) {
      return NextResponse.json({ hasCard: false, balance: 0, activities: [] })
    }

    const [balance, activities] = await Promise.all([
      getGiftCardBalance(gan),
      squareCardId ? getGiftCardActivities(squareCardId) : Promise.resolve([]),
    ])

    return NextResponse.json({
      hasCard: true,
      gan,
      balance,
      activities: activities.slice(0, 20),
    })
  } catch (err) {
    console.error('/api/gift-card/balance error:', err)
    return NextResponse.json({ error: 'Failed to load gift card' }, { status: 500 })
  }
}
