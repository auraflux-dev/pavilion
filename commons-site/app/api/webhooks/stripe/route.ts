import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { upsertFromStripeEvent } from '@/lib/db'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET missing' }, { status: 503 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (err) {
    console.error('stripe webhook verify failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
        return NextResponse.json({ ok: true, skipped: session.payment_status })
      }
      const meta = session.metadata || {}
      await upsertFromStripeEvent({
        eventId: event.id,
        status: session.status || 'checkout_completed',
        email: session.customer_details?.email || session.customer_email,
        customerId: typeof session.customer === 'string' ? session.customer : null,
        subscriptionId:
          typeof session.subscription === 'string' ? session.subscription : null,
        checkoutSessionId: session.id,
        schoolName: meta.schoolName || null,
        city: meta.city || null,
        role: meta.role || null,
        raw: event,
      })
    } else if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted' ||
      event.type === 'customer.subscription.created'
    ) {
      const sub = event.data.object as Stripe.Subscription
      const meta = sub.metadata || {}
      await upsertFromStripeEvent({
        eventId: event.id,
        status: sub.status,
        customerId: typeof sub.customer === 'string' ? sub.customer : null,
        subscriptionId: sub.id,
        schoolName: meta.schoolName || null,
        city: meta.city || null,
        role: meta.role || null,
        raw: event,
      })
    } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      const parentSub = invoice.parent?.subscription_details?.subscription
      const subId = typeof parentSub === 'string' ? parentSub : parentSub?.id || null
      await upsertFromStripeEvent({
        eventId: event.id,
        status: event.type === 'invoice.paid' ? 'invoice_paid' : 'invoice_payment_failed',
        email: invoice.customer_email,
        customerId: typeof invoice.customer === 'string' ? invoice.customer : null,
        subscriptionId: subId,
        raw: event,
      })
    }
  } catch (err) {
    console.error('webhook persist failed', err)
    return NextResponse.json({ error: 'Persist failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
