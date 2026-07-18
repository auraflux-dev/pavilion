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
