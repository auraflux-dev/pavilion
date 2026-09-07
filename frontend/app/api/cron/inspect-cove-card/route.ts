import { NextRequest, NextResponse } from 'next/server'
import { getGiftCardActivities, getGiftCardByGan, getGiftCardBalance } from '@/lib/square'
import { listFamilyStudents, resolveFamilyGiftCard } from '@/lib/family-store-card'

export const dynamic = 'force-dynamic'

function auth(req: NextRequest) {
  const a = req.headers.get('authorization') || ''
  const secrets = [process.env.CRON_SECRET, process.env.PURCHASE_RESEND_SECRET].map(s => s?.trim()).filter(Boolean) as string[]
  return secrets.some(s => a === `Bearer ${s}`)
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = String(req.nextUrl.searchParams.get('email') || '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
  const students = await listFamilyStudents(email)
  const card = resolveFamilyGiftCard(students)
  if (!card.gan) return NextResponse.json({ email, error: 'no gan', students: students.length })
  const live = await getGiftCardBalance(card.gan)
  const squareCard = await getGiftCardByGan(card.gan)
  const activities = squareCard?.id ? await getGiftCardActivities(squareCard.id) : []
  return NextResponse.json({
    email,
    gan: card.gan,
    giftCardId: squareCard?.id || card.giftCardId,
    liveBalance: live,
    wixBalance: card.balance,
    activities: activities.map(a => ({
      id: a.id,
      type: a.type,
      at: a.createdAt,
      load: a.loadMoney,
      redeem: a.redeemMoney,
      balanceAfter: a.balanceMoney,
    })),
  })
}
