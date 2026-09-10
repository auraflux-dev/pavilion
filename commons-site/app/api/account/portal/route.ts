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
          'No billing account linked yet. Finish signup or email us if you already paid.',
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
      return NextResponse.json({ error: 'Could not open billing portal. Try again or email us.' }, { status: 502 })
    }
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('billing portal failed', err)
    const message = err instanceof Error ? err.message : 'Billing portal unavailable. Try again.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
