/**
 * POST /api/checkout/paypal/pay-with-vault
 * Charge a PayPal wallet already saved on Payment methods.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import {
  recordConsentAcknowledgments,
  validateConsentAcks,
  type CheckoutConsentKind,
  type ConsentAck,
} from '@/lib/checkout-consent'
import {
  fulfillPaidCheckout,
  resolveCheckoutIntent,
  type CheckoutIntent,
} from '@/lib/checkout-fulfill'
import { resolvePrimaryParentEmail } from '@/lib/family-guardians'
import { chargePayPalVault, isPayPalConfigured } from '@/lib/paypal'
import { findStoredPaymentMethod, hasPayPalVault } from '@/lib/stored-payment-methods'
import { getEffectiveParentEmail } from '@/lib/staff/session'

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Log in to pay' }, { status: 401 })
  if (!isPayPalConfigured()) {
    return NextResponse.json({ error: 'PayPal is not configured' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const intent = body as CheckoutIntent & { consents?: ConsentAck[] }
    if (
      !intent.kind ||
      !['membership', 'product', 'store-card', 'program', 'event', 'donation', 'cart'].includes(intent.kind)
    ) {
      return NextResponse.json({ error: 'Invalid checkout kind' }, { status: 400 })
    }

    const consentCheck = validateConsentAcks(intent.kind as CheckoutConsentKind, intent.consents)
    if (!consentCheck.ok) {
      return NextResponse.json({ error: consentCheck.error }, { status: 400 })
    }

    const effective = await getEffectiveParentEmail(req)
    if (effective?.actingAs) {
      return NextResponse.json({ error: 'Act-as is read-only for payments.' }, { status: 403 })
    }
    const parentEmail = effective?.parentEmail ?? session.email
    const householdEmail = await resolvePrimaryParentEmail(parentEmail)
    const stored = await findStoredPaymentMethod(householdEmail)
    if (!hasPayPalVault(stored) || !stored?.paypalVaultId) {
      return NextResponse.json({ error: 'No saved PayPal on file.' }, { status: 400 })
    }

    const accountEmails = [effective?.actorEmail ?? session.email, ...session.emails]
    const resolved0 = await resolveCheckoutIntent(intent, parentEmail, accountEmails)
    const { withCoveSplit } = await import('@/lib/checkout-cove-split')
    const useCove = intent.kind === 'product' && intent.useCoveBalance !== false
    const resolved = await withCoveSplit(resolved0, parentEmail, useCove)
    const cardDue = Math.round(Number(resolved.meta.cardCents ?? resolved.amountCents) || 0) / 100
    if (!(cardDue > 0)) {
      return NextResponse.json(
        { error: 'Nothing left for PayPal. Pay with your Cove Digital Card in this checkout.' },
        { status: 400 },
      )
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

    const charged = await chargePayPalVault({
      amount: cardDue,
      description: resolved.description,
      customId: resolved.customId,
      vaultId: stored.paypalVaultId,
      softDescriptor: 'SHMSPTO',
    })

    if (charged.amount != null && Math.abs(charged.amount - cardDue) > 0.02) {
      console.error('PayPal vault amount mismatch', charged.amount, cardDue)
      return NextResponse.json({ error: 'Payment amount mismatch. contact the PTO' }, { status: 409 })
    }

    const transactionId = charged.captureId || charged.id
    const result = await fulfillPaidCheckout({
      resolved,
      parentEmail,
      parentName: name,
      transactionId,
      paymentMethod: 'PayPal (saved)',
      sourcePrefix: 'paypal',
      consents: consentCheck.acks,
    })

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
    console.error('PayPal pay-with-vault', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Saved PayPal payment failed' },
      { status: 400 },
    )
  }
}
