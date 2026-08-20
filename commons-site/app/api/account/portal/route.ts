import { NextResponse } from 'next/server'
import { readAccountEmail } from '@/lib/account'
import { findLatestSubscriptionByEmail } from '@/lib/db'
import { getStripe, siteOrigin, stripeConfigured } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST() {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 503 })
  }

  const email = await readAccountEmail()
  if (!email) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  }

  const sub = await findLatestSubscriptionByEmail(email)
  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      {
        error:
          'No Stripe customer on this account yet. Finish checkout or email us if you already paid.',
      },
      { status: 404 },
    )
  }

  try {
    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${siteOrigin()}/account`,
    })
    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a portal URL.' }, { status: 502 })
    }
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('billing portal failed', err)
    const message = err instanceof Error ? err.message : 'Stripe error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
