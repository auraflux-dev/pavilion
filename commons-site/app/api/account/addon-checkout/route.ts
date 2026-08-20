import { NextRequest, NextResponse } from 'next/server'
import { addonById } from '@/lib/addons'
import { readAccountEmail } from '@/lib/account'
import { findLatestSubscriptionByEmail } from '@/lib/db'
import { getStripe, siteOrigin, stripeConfigured } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 503 })
  }

  const email = await readAccountEmail()
  if (!email) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  }

  let body: { addonId?: string }
  try {
    body = (await req.json()) as { addonId?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const addon = addonById(String(body.addonId || ''))
  const priceId = addon?.priceId() || null
  if (!addon || !priceId) {
    return NextResponse.json(
      { error: 'That add-on is not available for self-serve checkout yet. Email us.' },
      { status: 400 },
    )
  }

  const sub = await findLatestSubscriptionByEmail(email)
  const stripe = getStripe()
  const origin = siteOrigin()

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: sub?.stripe_customer_id || undefined,
      customer_email: sub?.stripe_customer_id ? undefined : email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/account?addon=ok`,
      cancel_url: `${origin}/account`,
      allow_promotion_codes: true,
      metadata: {
        product: 'pavilion-addon',
        addonId: addon.id,
        schoolName: sub?.school_name || '',
      },
      subscription_data: {
        metadata: {
          product: 'pavilion-addon',
          addonId: addon.id,
        },
      },
    })
    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 })
    }
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('addon checkout failed', err)
    const message = err instanceof Error ? err.message : 'Stripe error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
