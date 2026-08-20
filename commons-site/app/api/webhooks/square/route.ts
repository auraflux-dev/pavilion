import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { upsertFromSquareEvent } from '@/lib/db'

export const runtime = 'nodejs'

function verifySignature(rawBody: string, signature: string | null, url: string): boolean {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim()
  if (!key) return false
  if (!signature) return false
  const payload = url + rawBody
  const expected = createHmac('sha256', key).update(payload).digest('base64')
  try {
    const a = Buffer.from(expected)
    const b = Buffer.from(signature)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-square-hmacsha256-signature')
  const notificationUrl =
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL?.trim() ||
    `${(process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')}/api/webhooks/square`

  if (!verifySignature(rawBody, signature, notificationUrl)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: {
    event_id?: string
    type?: string
    data?: { type?: string; id?: string; object?: Record<string, unknown> }
  }
  try {
    event = JSON.parse(rawBody) as typeof event
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventId = event.event_id || ''
  if (!eventId) {
    return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })
  }

  const type = event.type || ''
  const obj = (event.data?.object || {}) as Record<string, unknown>
  const subscription = (obj.subscription || obj) as Record<string, unknown>
  const paymentLink = (obj.payment_link || {}) as Record<string, unknown>

  let status = 'square_event'
  if (type.includes('subscription')) status = String(subscription.status || type)
  else if (type.includes('payment_link')) status = 'payment_link'
  else status = type || 'square_event'

  try {
    await upsertFromSquareEvent({
      eventId,
      status,
      email: typeof subscription.customer_email === 'string' ? subscription.customer_email : null,
      customerId:
        typeof subscription.customer_id === 'string'
          ? subscription.customer_id
          : typeof paymentLink.customer_id === 'string'
            ? paymentLink.customer_id
            : null,
      subscriptionId: typeof subscription.id === 'string' ? subscription.id : null,
      orderId:
        typeof subscription.charged_through_date === 'string'
          ? null
          : typeof paymentLink.order_id === 'string'
            ? paymentLink.order_id
            : null,
      paymentLinkId: typeof paymentLink.id === 'string' ? paymentLink.id : null,
      raw: event,
    })
  } catch (err) {
    console.error('webhook persist failed', err)
    return NextResponse.json({ error: 'Persist failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
