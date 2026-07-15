/**
 * POST /api/webhooks/square
 * Receives Square gift_card.activity.created events.
 * On REDEEM: checks if balance dropped below auto top-off threshold.
 * If so, and parent has auto top-off enabled, fires a LOAD activity.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { getWixClient } from '@/lib/wix-client'
import { loadGiftCard, getGiftCardByGan } from '@/lib/square'
import { randomUUID } from 'crypto'

const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? ''
const SQUARE_NOTIFICATION_URL = process.env.SQUARE_NOTIFICATION_URL ?? ''

function verifySquareSignature(req: NextRequest, body: string): boolean {
  if (!SQUARE_WEBHOOK_SIGNATURE_KEY) return false
  const signature = req.headers.get('x-square-hmacsha256-signature') ?? ''
  const hmac = createHmac('sha256', SQUARE_WEBHOOK_SIGNATURE_KEY)
  hmac.update(SQUARE_NOTIFICATION_URL + body)
  const expected = hmac.digest('base64')
  return signature === expected
}

export async function POST(req: NextRequest) {
  const body = await req.text()

  if (!verifySquareSignature(req, body)) {
    console.warn('Square webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only handle gift card activity created events
  if (event.type !== 'gift_card.activity.created') {
    return NextResponse.json({ ok: true })
  }

  const activity = event.data?.object?.gift_card_activity
  if (!activity || activity.type !== 'REDEEM') {
    return NextResponse.json({ ok: true })
  }

  const gan = activity.gift_card_gan
  const balanceCents = activity.gift_card_balance_money?.amount ?? 0

  if (!gan) return NextResponse.json({ ok: true })

  try {
    const adminClient = getWixClient()

    // Find student with this GAN
    const result = await adminClient.items
      .query('Students')
      .eq('squareGiftCardGan', gan)
      .find()

    const student = result.items?.[0] as any
    if (!student) return NextResponse.json({ ok: true })

    const autoTopOff = student.autoTopOff
    const thresholdCents = (student.topOffThreshold ?? 10) * 100
    const reloadCents = (student.topOffAmount ?? 20) * 100

    if (!autoTopOff || balanceCents > thresholdCents) {
      return NextResponse.json({ ok: true })
    }

    // Balance is at or below threshold — fire auto top-off
    console.log(`Auto top-off triggered for ${student.firstName} ${student.lastName}: balance $${balanceCents / 100}, reloading $${reloadCents / 100}`)

    const idempotencyKey = `topoff-${student._id}-${randomUUID()}`
    await loadGiftCard(gan, reloadCents, idempotencyKey)

    // Log the auto top-off in Wix for treasurer records
    await adminClient.items.insert('Payments', {
      studentId: student._id,
      programName: 'Auto Top-Off — Store Card',
      amount: reloadCents / 100,
      status: 'Paid',
      paymentDate: new Date().toISOString(),
      paymentMethod: 'Auto Top-Off',
      transactionId: idempotencyKey,
      source: 'square_auto_topoff',
    })

    console.log(`Auto top-off complete for ${student.firstName} ${student.lastName}`)
  } catch (err) {
    console.error('Square webhook auto top-off error:', err)
    // Return 200 so Square doesn't retry — we log the error
  }

  return NextResponse.json({ ok: true })
}
