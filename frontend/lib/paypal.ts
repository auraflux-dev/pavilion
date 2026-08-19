/**
 * PayPal REST helpers (Orders v2).
 * Env: NEXT_PUBLIC_PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENVIRONMENT=live|sandbox
 */

function paypalBaseUrl() {
  const env = (process.env.PAYPAL_ENVIRONMENT || 'live').toLowerCase()
  return env === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'
}

export function isPayPalConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
}

export function getPayPalPublicConfig() {
  return {
    configured: isPayPalConfigured(),
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? '',
    environment: (process.env.PAYPAL_ENVIRONMENT || 'live').toLowerCase() === 'sandbox'
      ? 'sandbox'
      : 'live',
  }
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !secret) throw new Error('PayPal is not configured')

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'PayPal auth failed')
  }
  return data.access_token as string
}

export type PaypalAccountPayment = {
  id: string
  date: string
  amount: number
  name: string
  type: string
}

function paypalApiDate(d: Date) {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/** Transaction Search (Reporting API). Needs Transaction Search enabled on the Live app. 31-day windows. */
export async function listPayPalAccountPayments(opts: {
  from: Date
  to: Date
}): Promise<{ payments: PaypalAccountPayment[]; error?: string }> {
  if (!isPayPalConfigured()) {
    return { payments: [], error: 'PayPal Client ID and Secret are not set on Vercel.' }
  }
  let token: string
  try {
    token = await getAccessToken()
  } catch (err) {
    return {
      payments: [],
      error: err instanceof Error ? err.message : 'PayPal login failed',
    }
  }
  const payments: PaypalAccountPayment[] = []
  const maxMs = 30 * 24 * 60 * 60 * 1000
  let cursor = opts.from.getTime()
  const end = Math.min(opts.to.getTime(), Date.now())
  while (cursor < end) {
    const sliceEnd = Math.min(cursor + maxMs, end)
    const start = paypalApiDate(new Date(cursor))
    const stop = paypalApiDate(new Date(sliceEnd))
    let page = 1
    for (;;) {
      const url = new URL(`${paypalBaseUrl()}/v1/reporting/transactions`)
      url.searchParams.set('start_date', start)
      url.searchParams.set('end_date', stop)
      url.searchParams.set('fields', 'transaction_info,payer_info,cart_info')
      url.searchParams.set('page_size', '100')
      url.searchParams.set('page', String(page))
      url.searchParams.set('transaction_status', 'S')
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const body = await res.text()
      if (!res.ok) {
        const hint =
          res.status === 403 || res.status === 401
            ? ' Enable Transaction Search on the PayPal Live app, then confirm Client ID and Secret on Vercel.'
            : ''
        return { payments, error: `PayPal reporting ${res.status}.${hint} ${body.slice(0, 180)}` }
      }
      const data = JSON.parse(body) as {
        transaction_details?: Array<{
          transaction_info?: {
            transaction_id?: string
            transaction_initiation_date?: string
            transaction_amount?: { value?: string }
            transaction_event_code?: string
            transaction_subject?: string
            invoice_id?: string
            custom_field?: string
          }
          payer_info?: { payer_name?: { alternate_full_name?: string } }
          cart_info?: { item_details?: Array<{ item_name?: string }> }
        }>
        total_pages?: number
      }
      for (const row of data.transaction_details ?? []) {
        const info = row.transaction_info ?? {}
        const amount = Number(info.transaction_amount?.value ?? 0)
        if (!(amount > 0)) continue
        const code = String(info.transaction_event_code ?? '')
        const type = code || 'payment'
        const item = row.cart_info?.item_details?.map((i) => i.item_name).filter(Boolean).join(' ') ?? ''
        const name = [info.transaction_subject, info.invoice_id, info.custom_field, item, row.payer_info?.payer_name?.alternate_full_name]
          .filter(Boolean)
          .join(' ')
        const when = String(info.transaction_initiation_date ?? '')
        payments.push({
          id: String(info.transaction_id ?? ''),
          date: when.slice(0, 10),
          amount,
          name,
          type,
        })
      }
      const pages = Number(data.total_pages ?? 1)
      if (page >= pages) break
      page += 1
    }
    cursor = sliceEnd + 1
  }
  return { payments }
}

export async function createPayPalOrder(opts: {
  amount: number
  description: string
  customId: string
  softDescriptor?: string
}): Promise<{ id: string }> {
  if (!Number.isFinite(opts.amount) || opts.amount < 1) {
    throw new Error('Invalid PayPal amount')
  }
  const token = await getAccessToken()
  const value = opts.amount.toFixed(2)
  const res = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value,
          },
          description: opts.description.slice(0, 127),
          custom_id: opts.customId.slice(0, 127),
          soft_descriptor: (opts.softDescriptor || 'SHMSPTO').slice(0, 22),
        },
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        brand_name: 'SHMS PTO',
      },
    }),
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok || !data.id) {
    console.error('PayPal create order failed', data)
    throw new Error(data.message || data.details?.[0]?.description || 'PayPal order create failed')
  }
  return { id: data.id as string }
}

export async function capturePayPalOrder(orderId: string): Promise<{
  id: string
  status: string
  captureId?: string
  amount?: number
}> {
  const token = await getAccessToken()
  const res = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: '{}',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('PayPal capture failed', data)
    throw new Error(data.message || data.details?.[0]?.description || 'PayPal capture failed')
  }
  const unit = data.purchase_units?.[0]
  const capture = unit?.payments?.captures?.[0]
  const status = String(capture?.status || data.status || '')
  if (status !== 'COMPLETED' && data.status !== 'COMPLETED') {
    throw new Error(`PayPal payment not completed (${status || data.status})`)
  }
  const amount = capture?.amount?.value ? parseFloat(capture.amount.value) : undefined
  return {
    id: data.id as string,
    status: 'COMPLETED',
    captureId: capture?.id as string | undefined,
    amount,
  }
}
