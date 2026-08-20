import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { insertCheckoutStarted } from '@/lib/db'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'
import {
  commonsPlanVariationId,
  getSquareClient,
  siteOrigin,
  squareConfigured,
  squareLocationId,
} from '@/lib/square'

export const runtime = 'nodejs'

type Body = {
  schoolName?: string
  city?: string
  email?: string
  role?: string
}

export async function POST(req: NextRequest) {
  if (!squareConfigured()) {
    return NextResponse.json(
      { error: 'Square checkout is not configured yet.' },
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
  const client = getSquareClient()
  const idempotencyKey = randomUUID()

  try {
    const result = await client.checkout.paymentLinks.create({
      idempotencyKey,
      description: `Commons · ${schoolName}`,
      checkoutOptions: {
        redirectUrl: `${origin}/thanks`,
        askForShippingAddress: false,
        subscriptionPlanId: commonsPlanVariationId(),
      },
      prePopulatedData: {
        buyerEmail: email,
      },
      paymentNote: `Commons $${COMMONS_LIST_PRICE_USD}/mo · ${schoolName} · ${city} · ${role}`,
      order: {
        locationId: squareLocationId(),
        lineItems: [
          {
            name: 'Commons PTO OS',
            quantity: '1',
            note: `${schoolName} (${city})`,
            basePriceMoney: {
              amount: BigInt(COMMONS_LIST_PRICE_USD * 100),
              currency: 'USD',
            },
          },
        ],
      },
    })

    const link = result.paymentLink
    const url = link?.url
    if (!url) {
      return NextResponse.json({ error: 'Square did not return a checkout URL.' }, { status: 502 })
    }

    try {
      await insertCheckoutStarted({
        email,
        schoolName,
        city,
        role,
        paymentLinkId: link?.id || null,
        raw: {
          schoolName,
          city,
          role,
          paymentLinkId: link?.id,
          orderId: link?.orderId,
        },
      })
    } catch (dbErr) {
      console.error('commons_subscriptions insert failed', dbErr)
    }

    return NextResponse.json({ url })
  } catch (err) {
    console.error('createPaymentLink failed', err)
    const message = err instanceof Error ? err.message : 'Square error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
