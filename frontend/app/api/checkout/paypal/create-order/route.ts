/**
 * POST /api/checkout/paypal/create-order
 * GET  /api/checkout/paypal/create-order → public config
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { resolveCheckoutIntent, type CheckoutIntent } from '@/lib/checkout-fulfill'
import { createPayPalOrder, isPayPalConfigured } from '@/lib/paypal'

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Log in to pay' }, { status: 401 })
  if (!isPayPalConfigured()) {
    return NextResponse.json({ error: 'PayPal is not configured' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const intent = body as CheckoutIntent
    if (!intent.kind || !['membership', 'product', 'store-card'].includes(intent.kind)) {
      return NextResponse.json({ error: 'Invalid checkout kind' }, { status: 400 })
    }

    const resolved = await resolveCheckoutIntent(intent, session.email)
    const order = await createPayPalOrder({
      amount: resolved.amount,
      description: resolved.description,
      customId: resolved.customId,
      softDescriptor: 'SHMSPTO',
    })

    return NextResponse.json({
      orderId: order.id,
      amount: resolved.amount,
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
