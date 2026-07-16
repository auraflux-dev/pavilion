/**
 * POST /api/gift-card/load
 * Parent manually loads funds onto their student's gift card.
 * Body: { studentId, amountCents }
 * Payment is handled by Wix Payments — this route is called after payment succeeds.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient } from '@/lib/wix-oauth-client'
import { getWixClient } from '@/lib/wix-client'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { loadGiftCard } from '@/lib/square'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const tokensCookie = req.cookies.get(TOKENS_COOKIE)?.value
  if (!tokensCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tokens = JSON.parse(tokensCookie)
    const oauthClient = createOAuthClient(tokens)
    const { member } = await oauthClient.members.getCurrentMember({ fieldsets: ['FULL'] })
    const email = member?.loginEmail ?? ''

    const { studentId, amountCents } = await req.json()
    if (!studentId || !amountCents || amountCents < 100) {
      return NextResponse.json({ error: 'studentId and amountCents (min 100) required' }, { status: 400 })
    }

    const adminClient = getWixClient()
    const student = await adminClient.items.get('Students', studentId) as any
    if (!student || student.archived === true || student.parentEmail !== email) {
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
