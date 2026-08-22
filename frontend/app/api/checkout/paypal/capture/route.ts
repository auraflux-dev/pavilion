/**
 * POST /api/checkout/paypal/capture
 * Capture approved PayPal order and fulfill membership / Cove / store-card.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getEffectiveParentEmail } from '@/lib/staff/session'
import {
  fulfillPaidCheckout,
  resolveCheckoutIntent,
  type CheckoutIntent,
} from '@/lib/checkout-fulfill'
import { resolvePrimaryParentEmail } from '@/lib/family-guardians'
import { capturePayPalOrder, isPayPalConfigured } from '@/lib/paypal'
import { upsertStoredPaymentMethod } from '@/lib/stored-payment-methods'
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
    if (!intent.kind || !['membership', 'product', 'store-card', 'program', 'event', 'donation', 'cart'].includes(intent.kind)) {
      return NextResponse.json({ error: 'Invalid checkout kind' }, { status: 400 })
    }

    const consentCheck = validateConsentAcks(intent.kind as CheckoutConsentKind, intent.consents)
    if (!consentCheck.ok) {
      return NextResponse.json({ error: consentCheck.error }, { status: 400 })
    }

    const effective = await getEffectiveParentEmail(req)
    const parentEmail = effective?.parentEmail ?? session.email
    const accountEmails = [
      effective?.actorEmail ?? session.email,
      ...session.emails,
    ]
    const resolved0 = await resolveCheckoutIntent(intent, parentEmail, accountEmails)
    const { withCoveSplit } = await import('@/lib/checkout-cove-split')
    const useCove =
      (intent.kind === 'product' || intent.kind === 'cart') && intent.useCoveBalance !== false
    const resolved = await withCoveSplit(resolved0, parentEmail, useCove)
    const cardDue = Math.round(Number(resolved.meta.cardCents ?? resolved.amountCents) || 0) / 100
    const captured = await capturePayPalOrder(orderId)

    // Soft-check captured amount vs card remainder (tolerance 1 cent)
    if (captured.amount != null && Math.abs(captured.amount - cardDue) > 0.02) {
      console.error('PayPal amount mismatch', captured.amount, cardDue)
      return NextResponse.json({ error: 'Payment amount mismatch. contact the PTO' }, { status: 409 })
    }

    let name =
      `${session.member.contact?.firstName ?? ''} ${session.member.contact?.lastName ?? ''}`.trim()
    if (!name || !/\s/.test(name)) {
      return NextResponse.json(
        {
          error: 'Enter your first and last name in My Account before paying with PayPal.',
          errorCode: 'parentNameRequired',
        },
        { status: 400 },
      )
    }

    const householdEmail = await resolvePrimaryParentEmail(parentEmail)
    if (Boolean(body.savePayPal) && captured.vaultId) {
      await upsertStoredPaymentMethod(householdEmail, {
        wixMemberId: session.memberId,
        paypalVaultId: captured.vaultId,
        paypalCustomerId: captured.paypalCustomerId,
        paypalPayerEmail: captured.payerEmail,
      })
    }

    const transactionId = captured.captureId || captured.id
    const result = await fulfillPaidCheckout({
      resolved,
      parentEmail,
      parentName: name,
      transactionId,
      paymentMethod: 'PayPal',
      sourcePrefix: 'paypal',
      consents: consentCheck.acks,
    })

    // Program enroll records its own consents; membership/other need this trail here.
    if (intent.kind !== 'program') {
      await recordConsentAcknowledgments({
        parentEmail,
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
