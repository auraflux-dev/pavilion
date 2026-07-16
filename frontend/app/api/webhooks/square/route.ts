/**
 * POST /api/webhooks/square
 * Receives Square gift_card.activity.created events.
 * On REDEEM: checks if balance dropped below auto top-off threshold.
 * If so, and parent has auto top-off enabled, fires a LOAD activity.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { getWixClient } from '@/lib/wix-client'
import { chargePayment, loadGiftCard } from '@/lib/square'

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

  if (event.type !== 'gift_card.activity.created') {
    return NextResponse.json({ ok: true })
  }

  const activity = event.data?.object?.gift_card_activity
  if (!activity || activity.type !== 'REDEEM') {
    return NextResponse.json({ ok: true })
  }

  const gan = activity.gift_card_gan
  const balanceCents = Number(activity.gift_card_balance_money?.amount ?? 0)
  if (!gan) return NextResponse.json({ ok: true })

  try {
    const adminClient = getWixClient()
    const result = await adminClient.items
      .query('Students')
      .eq('squareGiftCardGan', gan)
      .find()
    const student = result.items?.[0] as any
    if (!student) return NextResponse.json({ ok: true })

    const thresholdCents = Number(student.topOffThreshold ?? 10) * 100
    const reloadCents = Number(student.topOffAmount ?? 20) * 100
    if (!student.autoTopOff || balanceCents > thresholdCents) {
      return NextResponse.json({ ok: true })
    }

    const parentEmail = String(student.parentEmail ?? '').trim().toLowerCase()
    const methods = await adminClient.items
      .query('StoredPaymentMethods')
      .eq('parentEmail', parentEmail)
      .eq('active', true)
      .find()
    const method = methods.items?.[0] as any
    if (!method?.squareCardId || !method?.squareCustomerId) {
      await adminClient.items.update('Students', {
        ...student,
        autoTopOff: false,
      })
      await adminClient.items.insert('Payments', {
        studentId: student._id,
        programName: 'Auto Top-Off — Store Card',
        amount: reloadCents / 100,
        status: 'Disabled — No Payment Method',
        paymentDate: new Date().toISOString(),
        paymentMethod: 'Auto Top-Off',
        transactionId: event.event_id ?? activity.id ?? '',
        source: 'square_auto_topoff_no_payment_method',
      })
      return NextResponse.json({ ok: true, disabled: true })
    }

    const eventKey = String(event.event_id ?? activity.id ?? `${student._id}-${activity.created_at}`)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(-30)
    const paymentKey = `topoff-pay-${eventKey}`.slice(0, 45)
    const payment = await chargePayment({
      sourceId: method.squareCardId,
      amountCents: reloadCents,
      idempotencyKey: paymentKey,
      customerId: method.squareCustomerId,
      referenceId: `topoff:${student._id}`,
      buyerEmailAddress: parentEmail,
      note: `SHMS auto top-off for ${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
    })

    const loadKey = `topoff-load-${eventKey}`.slice(0, 45)
    try {
      await loadGiftCard(gan, reloadCents, loadKey)
      await adminClient.items.insert('Payments', {
        studentId: student._id,
        programName: 'Auto Top-Off — Store Card',
        amount: reloadCents / 100,
        status: 'Paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: `${method.brand ?? 'Card'} •••• ${method.last4 ?? ''}`,
        transactionId: payment.id ?? paymentKey,
        source: 'square_auto_topoff',
      })
      console.log(`Auto top-off complete for ${student.firstName} ${student.lastName}`)
    } catch (loadError) {
      await adminClient.items.insert('Payments', {
        studentId: student._id,
        programName: 'Auto Top-Off — Store Card',
        amount: reloadCents / 100,
        status: 'Needs Reconciliation',
        paymentDate: new Date().toISOString(),
        paymentMethod: `${method.brand ?? 'Card'} •••• ${method.last4 ?? ''}`,
        transactionId: payment.id ?? paymentKey,
        source: 'square_auto_topoff_load_failed',
      })
      console.error('Auto top-off payment completed but gift card load failed:', loadError)
    }
  } catch (err) {
    console.error('Square webhook auto top-off error:', err)
    return NextResponse.json({ error: 'Auto top-off failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
