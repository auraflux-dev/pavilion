/**
 * POST /api/checkout/paypal/create-order
 * GET  /api/checkout/paypal/create-order → public config
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getEffectiveParentEmail } from '@/lib/staff/session'
import { resolveCheckoutIntent, type CheckoutIntent } from '@/lib/checkout-fulfill'
import { createPayPalOrder, isPayPalConfigured } from '@/lib/paypal'
import {
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
    const intent = body as CheckoutIntent & { consents?: ConsentAck[] }
    if (!intent.kind || !['membership', 'product', 'store-card', 'program', 'event', 'donation'].includes(intent.kind)) {
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
    const resolved = await resolveCheckoutIntent(intent, parentEmail, accountEmails)
    const { withCoveSplit, checkoutAllowsCoveSplit, wantsCoveBalance } = await import(
      '@/lib/checkout-cove-split'
    )
    const useCove =
      checkoutAllowsCoveSplit(intent.kind) && wantsCoveBalance(intent.useCoveBalance)
    const split = await withCoveSplit(resolved, parentEmail, useCove)
    const cardCents = Math.round(Number(split.meta.cardCents ?? split.amountCents) || 0)
    if (cardCents <= 0) {
      return NextResponse.json(
        { error: 'Nothing left for PayPal. Pay with your Cove Digital Card in this checkout.' },
        { status: 400 },
      )
    }
    const savePayPal = Boolean(body.savePayPal)
    const order = await createPayPalOrder({
      amount: cardCents / 100,
      description: resolved.description,
      customId: resolved.customId,
      softDescriptor: 'SHMSPTO',
      savePayPal,
    })

    return NextResponse.json({
      orderId: order.id,
      amount: cardCents / 100,
      description: resolved.description,
    })
  } catch (err) {
    console.error('PayPal create-order', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not start PayPal checkout' },
      { status: 400 }
    )
  }
}
