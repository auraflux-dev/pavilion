/**
 * POST /api/checkout/paypal/capture
 * Capture approved PayPal order and fulfill membership / Cove / store-card.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import {
  fulfillPaidCheckout,
  resolveCheckoutIntent,
  type CheckoutIntent,
} from '@/lib/checkout-fulfill'
import { capturePayPalOrder, isPayPalConfigured } from '@/lib/paypal'
import {
  recordConsentAcknowledgments,
  validateConsentAcks,
  type CheckoutConsentKind,
  type ConsentAck,
} from '@/lib/checkout-consent'

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Log in to pay' }, { status: 401 })
  if (!isPayPalConfigured()) {
    return NextResponse.json({ error: 'PayPal is not configured' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const orderId = String(body.orderId ?? '').trim()
    const intent = body as CheckoutIntent & { orderId?: string; consents?: ConsentAck[] }
    if (!orderId) return NextResponse.json({ error: 'Missing PayPal order' }, { status: 400 })
    if (!intent.kind || !['membership', 'product', 'store-card', 'program'].includes(intent.kind)) {
      return NextResponse.json({ error: 'Invalid checkout kind' }, { status: 400 })
    }

    const consentCheck = validateConsentAcks(intent.kind as CheckoutConsentKind, intent.consents)
    if (!consentCheck.ok) {
      return NextResponse.json({ error: consentCheck.error }, { status: 400 })
    }

    const resolved = await resolveCheckoutIntent(intent, session.email)
    const captured = await capturePayPalOrder(orderId)

    // Soft-check captured amount vs quote (tolerance 1 cent)
    if (captured.amount != null && Math.abs(captured.amount - resolved.amount) > 0.02) {
      console.error('PayPal amount mismatch', captured.amount, resolved.amount)
      return NextResponse.json({ error: 'Payment amount mismatch — contact the PTO' }, { status: 409 })
    }

    const name =
      `${session.member.contact?.firstName ?? ''} ${session.member.contact?.lastName ?? ''}`.trim()

    const transactionId = captured.captureId || captured.id
    const result = await fulfillPaidCheckout({
      resolved,
      parentEmail: session.email,
      parentName: name,
      transactionId,
      paymentMethod: 'PayPal',
      sourcePrefix: 'paypal',
      consents: consentCheck.acks,
    })

    // Program enroll records its own consents; membership/other need this trail here.
    if (intent.kind !== 'program') {
      await recordConsentAcknowledgments({
        parentEmail: session.email,
        kind: intent.kind as CheckoutConsentKind,
        transactionId,
        studentId: intent.studentId,
        acks: consentCheck.acks,
      })
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('PayPal capture', err)
    const status = (err as { status?: number })?.status === 502 ? 502 : 400
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'PayPal payment failed',
        paymentId: (err as { paymentId?: string })?.paymentId,
      },
      { status }
    )
  }
}
