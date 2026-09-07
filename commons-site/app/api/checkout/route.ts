import { NextRequest, NextResponse } from 'next/server'
import { insertCheckoutStarted } from '@/lib/db'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'
import { commonsPriceId, getStripe, siteOrigin, stripeConfigured } from '@/lib/stripe'

export const runtime = 'nodejs'

type Body = {
  schoolName?: string
  city?: string
  email?: string
  role?: string
}

export async function POST(req: NextRequest) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe checkout is not configured yet.' },
      { status: 503 },
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const schoolName = String(body.schoolName || '').trim()
  const city = String(body.city || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const role = String(body.role || '').trim()
  if (!schoolName || !city || !email || !email.includes('@')) {
    return NextResponse.json({ error: 'School, city, and email are required.' }, { status: 400 })
  }

  const origin = siteOrigin()
  const stripe = getStripe()

  try {
    const automaticTax = process.env.STRIPE_AUTOMATIC_TAX === '1'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: commonsPriceId(), quantity: 1 }],
      success_url: `${origin}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing#checkout`,
      allow_promotion_codes: true,
      // Required for Stripe Tax once STRIPE_AUTOMATIC_TAX=1 and Tax registrations exist.
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      ...(automaticTax ? { automatic_tax: { enabled: true } } : {}),
      metadata: {
        product: 'pavilion',
        schoolName,
        city,
        role,
        listPriceUsd: String(COMMONS_LIST_PRICE_USD),
      },
      subscription_data: {
        metadata: {
          product: 'pavilion',
          schoolName,
          city,
          role,
        },
      },
      // Do not set payment_method_types — use Dashboard dynamic payment methods.
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 })
    }

    try {
      await insertCheckoutStarted({
        email,
        schoolName,
        city,
        role,
        checkoutSessionId: session.id,
        raw: {
          schoolName,
          city,
          role,
          checkoutSessionId: session.id,
        },
      })
    } catch (dbErr) {
      console.error('commons_subscriptions insert failed', dbErr)
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('stripe checkout.sessions.create failed', err)
    const message = err instanceof Error ? err.message : 'Stripe error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
