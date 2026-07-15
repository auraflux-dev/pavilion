/**
 * GET /api/gift-card/balance?studentId=xxx
 * Returns live Square balance + recent activity for a student's gift card.
 * Validates the student belongs to the logged-in parent.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient } from '@/lib/wix-oauth-client'
import { getWixClient } from '@/lib/wix-client'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { getGiftCardBalance, getGiftCardActivities, getGiftCardById } from '@/lib/square'

export async function GET(req: NextRequest) {
  const tokensCookie = req.cookies.get(TOKENS_COOKIE)?.value
  if (!tokensCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentId = req.nextUrl.searchParams.get('studentId')
  if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

  try {
    const tokens = JSON.parse(tokensCookie)
    const oauthClient = createOAuthClient(tokens)
    const { member } = await oauthClient.members.getCurrentMember({ fieldsets: ['FULL'] })
    const email = member?.loginEmail ?? ''

    const adminClient = getWixClient()
    const student = await adminClient.items.get('Students', studentId) as any
    if (!student || student.parentEmail !== email) {
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
