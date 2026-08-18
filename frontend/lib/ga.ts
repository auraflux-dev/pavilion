/**
 * Google Analytics 4 recommended events.
 * Page views come from gtag config. This module is conversions only.
 * Never send email, name, or student names.
 */

export type GaSurface = 'website' | 'member' | 'staff'

export type GaItem = {
  item_id?: string
  item_name: string
  item_category?: string
  price?: number
  quantity?: number
}

type PayKind = 'membership' | 'product' | 'store-card' | 'program' | 'event' | 'donation'

type PayBodyLike = {
  kind: PayKind
  tier?: string
  productId?: string
  programId?: string
  eventId?: string
  quantity?: number
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

function money(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

function once(key: string) {
  if (typeof window === 'undefined') return false
  try {
    const k = `ga4:${key}`
    if (sessionStorage.getItem(k)) return false
    sessionStorage.setItem(k, '1')
    return true
  } catch {
    return true
  }
}

export function gaSurface(pathname?: string): GaSurface {
  const path =
    pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '')
  if (path.startsWith('/staff')) return 'staff'
  if (path.startsWith('/member-portal')) return 'member'
  return 'website'
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()) return
  if (typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}

export function markPendingAuth(method: string, action: 'login' | 'sign_up') {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem('ga4:pending_auth', JSON.stringify({ method, action }))
  } catch {
    /* ignore */
  }
}

export function consumePendingAuth(): { method: string; action: 'login' | 'sign_up' } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem('ga4:pending_auth')
    if (!raw) return null
    sessionStorage.removeItem('ga4:pending_auth')
    const parsed = JSON.parse(raw) as { method?: string; action?: string }
    if (parsed.action !== 'login' && parsed.action !== 'sign_up') return null
    return { method: String(parsed.method || 'unknown'), action: parsed.action }
  } catch {
    return null
  }
}

export function clearPendingAuth() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem('ga4:pending_auth')
  } catch {
    /* ignore */
  }
}

export function trackLogin(method: string, surface: GaSurface = gaSurface()) {
  if (!once(`login:${method}:${surface}`)) return
  trackEvent('login', { method, surface })
}

export function trackSignUp(method: string, surface: GaSurface = gaSurface()) {
  if (!once(`sign_up:${method}`)) return
  trackEvent('sign_up', { method, surface })
}

export function itemsFromPayBody(
  payBody: PayBodyLike,
  title: string,
  amount: number,
): GaItem[] {
  const quantity =
    payBody.kind === 'event' && Number(payBody.quantity) > 0 ? Number(payBody.quantity) : 1
  const itemId =
    payBody.kind === 'membership'
      ? payBody.tier
      : payBody.kind === 'product'
        ? payBody.productId
        : payBody.kind === 'program'
          ? payBody.programId
          : payBody.kind === 'event'
            ? payBody.eventId
            : payBody.kind
  return [
    {
      item_id: itemId || payBody.kind,
      item_name: title || payBody.kind,
      item_category: payBody.kind,
      price: money(amount / quantity),
      quantity,
    },
  ]
}

export function trackBeginCheckout(opts: {
  value: number
  items: GaItem[]
  surface?: GaSurface
}) {
  trackEvent('begin_checkout', {
    currency: 'USD',
    value: money(opts.value),
    items: opts.items,
    surface: opts.surface ?? gaSurface(),
  })
}

function purchaseIdFromResult(data: Record<string, unknown>) {
  for (const key of ['paymentId', 'transactionId', 'orderId'] as const) {
    const value = data[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export function trackPurchase(opts: {
  transactionId: string
  value: number
  items: GaItem[]
  surface?: GaSurface
  paymentType?: string
}) {
  const transactionId = opts.transactionId.trim()
  if (!transactionId) return
  if (!once(`purchase:${transactionId}`)) return
  trackEvent('purchase', {
    transaction_id: transactionId,
    currency: 'USD',
    value: money(opts.value),
    items: opts.items,
    surface: opts.surface ?? gaSurface(),
    ...(opts.paymentType ? { payment_type: opts.paymentType } : {}),
  })
}

export function trackCheckoutPurchase(opts: {
  data: Record<string, unknown>
  amount: number
  title: string
  payBody: PayBodyLike
  paymentType: string
  surface?: GaSurface
}) {
  const transactionId = purchaseIdFromResult(opts.data)
  if (!transactionId) return
  trackPurchase({
    transactionId,
    value: opts.amount,
    items: itemsFromPayBody(opts.payBody, opts.title, opts.amount),
    paymentType: opts.paymentType,
    surface: opts.surface,
  })
}

export function trackGenerateLead(opts: {
  formId: string
  leadType?: string
  surface?: GaSurface
}) {
  trackEvent('generate_lead', {
    currency: 'USD',
    form_id: opts.formId,
    lead_type: opts.leadType ?? opts.formId,
    surface: opts.surface ?? gaSurface(),
  })
}
