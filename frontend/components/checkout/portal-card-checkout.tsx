'use client'

/**
 * In-portal Square card checkout. Personal credit/debit card for any ecommerce.
 * Free and paid members. Saved card is optional convenience, never required.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, CreditCard, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PortalPayPalButtons } from '@/components/checkout/portal-paypal-buttons'
import { CheckoutConsent } from '@/components/checkout/checkout-consent'
import type { ConsentAck, CheckoutConsentKind } from '@/lib/checkout-consent'
import { itemsFromPayBody, trackBeginCheckout, trackCheckoutPurchase } from '@/lib/ga'
import { getStoredCouponCode, setStoredCouponCode } from '@/lib/start-checkout'

type StoredCard = {
  brand: string
  last4: string
}

type SquareTokenResult = {
  status: string
  token?: string
  errors?: { message?: string }[]
}

type SquareCard = {
  attach(selector: string): Promise<void>
  tokenize(): Promise<SquareTokenResult>
  destroy(): Promise<void>
}

type SquareWallet = {
  attach?(selector: string, options?: Record<string, string>): Promise<void>
  tokenize(): Promise<SquareTokenResult>
  destroy(): Promise<void>
}

type SquarePayments = {
  card(): Promise<SquareCard>
  paymentRequest(options: {
    countryCode: string
    currencyCode: string
    total: { amount: string; label: string }
  }): unknown
  applePay(paymentRequest: unknown): Promise<SquareWallet>
  googlePay(paymentRequest: unknown): Promise<SquareWallet>
}

declare global {
  interface Window {
    Square?: {
      payments(applicationId: string, locationId: string): Promise<SquarePayments>
    }
  }
}

export type PortalPayBody =
  | {
      kind: 'membership'
      tier: string
      studentId?: string | null
      shirtSize?: string | null
      shirtDesign?: string | null
      shirtProductId?: string | null
      shirtVariantId?: string | null
      physicalPerk?: 'spirit_shirt' | 'magnet' | null
      useCoveBalance?: boolean
      consents?: ConsentAck[]
    }
  | { kind: 'product'; productId: string; variantId?: string; couponCode?: string | null; useCoveBalance?: boolean; consents?: ConsentAck[] }
  | { kind: 'store-card'; studentId: string; amountCents: number; consents?: ConsentAck[] }
  | {
      kind: 'program'
      programId: string
      studentId: string
      couponCode?: string | null
      addonProgramIds?: string[]
      useCoveBalance?: boolean
      consents?: ConsentAck[]
    }
  | {
      kind: 'event'
      eventId: string
      quantity: number
      useCoveBalance?: boolean
      consents?: ConsentAck[]
    }
  | {
      kind: 'donation'
      amountCents: number
      note?: string
      useCoveBalance?: boolean
      consents?: ConsentAck[]
    }
  | {
      kind: 'cart'
      cartLines: Exclude<PortalPayBody, { kind: 'cart' }>[]
      useCoveBalance?: boolean
      consents?: ConsentAck[]
      couponCode?: string | null
    }

interface Props {
  open: boolean
  onClose: () => void
  /** Dollars shown in the pay button */
  amount: number
  title: string
  subtitle?: string
  payBody: PortalPayBody
  onPaid?: (data: Record<string, unknown>) => void
  /** Unique DOM id so multiple forms can mount */
  containerId?: string
  /** When consents were already collected (e.g. Program register), skip the checkbox UI */
  prefilledConsents?: ConsentAck[]
  /** modal = fixed overlay (default); page = inline on /checkout */
  variant?: 'modal' | 'page'
  /** Buy now: prefer payment step when review extras are not required */
  express?: boolean
}

export function PortalCardCheckout({
  open,
  onClose,
  amount,
  title,
  subtitle,
  payBody,
  onPaid,
  containerId = 'portal-square-card',
  prefilledConsents,
  variant = 'modal',
  express = false,
}: Props) {
  const isPage = variant === 'page'
  const [config, setConfig] = useState<{
    configured: boolean
    applicationId: string
    locationId: string
    environment: string
  } | null>(null)
  const [storedCard, setStoredCard] = useState<StoredCard | null>(null)
  const [useStored, setUseStored] = useState(false)
  const [saveCard, setSaveCard] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [nextSteps, setNextSteps] = useState<string[]>([])
  const [portalHref, setPortalHref] = useState('')
  const [emailed, setEmailed] = useState(false)
  const [consents, setConsents] = useState<ConsentAck[] | null>(prefilledConsents ?? null)
  const [consentComplete, setConsentComplete] = useState(Boolean(prefilledConsents?.length))
  const [needsName, setNeedsName] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [couponCode, setCouponCode] = useState('')
  /** Opt-in only. never pre-check Cove. */
  const [useCove, setUseCove] = useState(false)
  /** review = amount/Cove/terms; pay = card/PayPal */
  const [step, setStep] = useState<'review' | 'pay'>('review')
  const [quote, setQuote] = useState<{
    amount: number
    listAmount?: number
    discountPercent?: number
    discountCode?: string
    coveDollars?: number
    cardDollars?: number
    coveBalance?: number
    error?: string
  } | null>(null)
  const cardRef = useRef<SquareCard | null>(null)
  const applePayRef = useRef<SquareWallet | null>(null)
  const googlePayRef = useRef<SquareWallet | null>(null)
  const [applePayReady, setApplePayReady] = useState(false)
  const [googlePayReady, setGooglePayReady] = useState(false)
  /** Keep Google Pay mount sized until Square attach finishes (zero-size attach fails). */
  const [googlePayTried, setGooglePayTried] = useState(false)

  useEffect(() => {
    if (!open) return
    const stored = getStoredCouponCode()
    if (stored) setCouponCode(stored)
    setStep(express ? 'pay' : 'review')
    setUseCove(false)
  }, [open, express])

  // Lock page scroll while modal is open so the sheet scrolls, not the page behind.
  useEffect(() => {
    if (!open || isPage) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, isPage])

  const quotePayKey = [
    payBody.kind,
    'tier' in payBody ? payBody.tier : '',
    'productId' in payBody ? payBody.productId : '',
    'variantId' in payBody ? payBody.variantId : '',
    'programId' in payBody ? payBody.programId : '',
    'studentId' in payBody ? payBody.studentId : '',
    'eventId' in payBody ? payBody.eventId : '',
    'amountCents' in payBody ? payBody.amountCents : '',
    'addonProgramIds' in payBody && Array.isArray(payBody.addonProgramIds)
      ? payBody.addonProgramIds.join(',')
      : '',
    payBody.kind === 'cart'
      ? payBody.cartLines
          .map((l) => `${l.kind}:${'productId' in l ? l.productId : ''}:${'programId' in l ? l.programId : ''}:${'tier' in l ? l.tier : ''}:${'eventId' in l ? l.eventId : ''}:${'amountCents' in l ? l.amountCents : ''}`)
          .join(',')
      : '',
  ].join('|')

  useEffect(() => {
    if (!open) return
    const coveKinds = new Set(['product', 'program', 'membership', 'event', 'donation', 'cart'])
    if (!coveKinds.has(payBody.kind)) {
      setQuote({ amount })
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      fetch('/api/checkout/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payBody,
          couponCode: couponCode.trim() || undefined,
          useCoveBalance: useCove,
        }),
      })
        .then(async (r) => {
          const data = await r.json()
          if (cancelled) return
          if (!r.ok) {
            setQuote({ amount, error: data.error || 'Could not apply that code.' })
            return
          }
          setQuote({
            amount: Number(data.amount) || amount,
            listAmount: Number(data.listAmount ?? data.listPrice) || undefined,
            discountPercent: Number(data.discountPercent) || 0,
            discountCode: String(data.discountCode || ''),
            coveDollars: Number(data.coveDollars) || 0,
            cardDollars: Number(data.cardDollars ?? data.amount) || 0,
            coveBalance: Number(data.coveBalance) || 0,
          })
        })
        .catch(() => {
          if (!cancelled) setQuote({ amount })
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- payBody object identity changes every parent render
  }, [open, amount, couponCode, useCove, quotePayKey])

  useEffect(() => {
    if (!open) return
    trackBeginCheckout({
      value: amount,
      items: itemsFromPayBody(payBody, title, amount),
    })
    // Intentionally keyed on kind + amount so parent re-renders do not re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, amount, title, payBody.kind])

  const cartConsentKinds: CheckoutConsentKind[] | undefined =
    payBody.kind === 'cart'
      ? [
          ...new Set(
            payBody.cartLines
              .map((l) => l.kind)
              .filter(
                (k): k is 'membership' | 'program' | 'event' | 'product' =>
                  k === 'membership' || k === 'program' || k === 'event' || k === 'product',
              ),
          ),
        ]
      : undefined
  const consentKind: CheckoutConsentKind =
    payBody.kind === 'cart'
      ? 'cart'
      : payBody.kind === 'membership' || payBody.kind === 'program' || payBody.kind === 'event'
        ? payBody.kind
        : 'product'
  const needsConsent =
    payBody.kind === 'cart' ||
    payBody.kind === 'membership' ||
    payBody.kind === 'program' ||
    payBody.kind === 'event'
  const showConsentUi = needsConsent && !prefilledConsents?.length
  const due = quote?.amount ?? amount
  /** Wait for quote before mounting Square when Cove split can change cardDue. */
  const coveSplitKind =
    payBody.kind === 'product' ||
    payBody.kind === 'membership' ||
    payBody.kind === 'program' ||
    payBody.kind === 'event' ||
    payBody.kind === 'donation' ||
    payBody.kind === 'cart'
  const productAwaitingQuote = coveSplitKind && quote == null
  const cardDue = coveSplitKind
    ? Number(quote?.cardDollars ?? (productAwaitingQuote ? 0 : due))
    : due
  const coveDue = coveSplitKind ? Number(quote?.coveDollars ?? 0) : 0
  const needsCard = !productAwaitingQuote && cardDue >= 1
  const nameReady = !needsName || (firstName.trim().length > 0 && lastName.trim().length > 0)

  const onConsentChange = useCallback((acks: ConsentAck[] | null, complete: boolean) => {
    setConsents(acks)
    setConsentComplete(complete)
  }, [])

  useEffect(() => {
    if (prefilledConsents?.length) {
      setConsents(prefilledConsents)
      setConsentComplete(true)
    }
  }, [prefilledConsents, open])

  useEffect(() => {
    if (!open) return
    setError('')
    setSuccess('')
    setNeedsName(false)
    setFirstName('')
    setLastName('')
    fetch('/api/gift-card/payment-method')
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          throw new Error(
            typeof data.error === 'string' ? data.error : 'Payment settings could not be loaded.',
          )
        }
        return data
      })
      .then((data) => {
        setConfig(data)
        const method = data.paymentMethod ?? null
        setStoredCard(method)
        // Prefer typing your own card; saved is an option, not the default gate
        setUseStored(false)
        // First purchase: offer save by default so the card lands on Payment methods.
        setSaveCard(!method)
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Payment settings could not be loaded.'),
      )
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        const member = data?.member
        const missing =
          Boolean(member?.needsName) ||
          !String(member?.firstName ?? '').trim() ||
          !String(member?.lastName ?? '').trim()
        setNeedsName(missing)
        if (!missing) {
          setFirstName(String(member?.firstName ?? '').trim())
          setLastName(String(member?.lastName ?? '').trim())
        }
      })
      .catch(() => {
        // If we cannot load profile, still allow checkout UI; pay API will enforce name.
        setNeedsName(true)
      })
  }, [open])

  async function loadSquareSdk() {
    if (!config) throw new Error('Square is not configured')
    const src =
      config.environment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js'
    let script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = src
      script.async = true
      document.head.appendChild(script)
      await new Promise<void>((resolve, reject) => {
        script!.onload = () => resolve()
        script!.onerror = () => reject(new Error('Square payment form failed to load'))
      })
    } else if (!window.Square) {
      await new Promise<void>((resolve) => {
        script!.addEventListener('load', () => resolve(), { once: true })
      })
    }
    if (!window.Square) throw new Error('Square SDK unavailable')
    return window.Square.payments(config.applicationId, config.locationId)
  }

  // Card form (only when entering a new card)
  useEffect(() => {
    if (!open || step !== 'pay' || !config?.configured || useStored || !needsCard) return
    let cancelled = false

    async function setupCard() {
      const payments = await loadSquareSdk()
      if (cancelled) return
      await cardRef.current?.destroy().catch(() => undefined)
      const card = await payments.card()
      await card.attach(`#${containerId}`)
      if (cancelled) {
        await card.destroy().catch(() => undefined)
        return
      }
      cardRef.current = card
      setReady(true)
    }

    setupCard().catch((err) => setError(err instanceof Error ? err.message : 'Payment form unavailable'))
    return () => {
      cancelled = true
      cardRef.current?.destroy().catch(() => undefined)
      cardRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadSquareSdk closes over config
  }, [open, step, config, useStored, containerId, needsCard])

  // Apple Pay + Google Pay (independent of saved-card toggle)
  useEffect(() => {
    if (!open || step !== 'pay' || !config?.configured || !needsCard) return
    let cancelled = false

    async function setupWallets() {
      setApplePayReady(false)
      setGooglePayReady(false)
      setGooglePayTried(false)
      await applePayRef.current?.destroy().catch(() => undefined)
      await googlePayRef.current?.destroy().catch(() => undefined)
      applePayRef.current = null
      googlePayRef.current = null

      const payments = await loadSquareSdk()
      if (cancelled) return

      // Let the mount targets paint before Square attach (hidden/zero-size fails).
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

      const amount = Math.max(cardDue, 0.01).toFixed(2)
      const label = title || 'Stone Hill PTO'

      try {
        const googleHost = document.getElementById(`${containerId}-google-pay`)
        if (!googleHost) throw new Error('Google Pay mount missing')
        const googlePay = await payments.googlePay(
          payments.paymentRequest({
            countryCode: 'US',
            currencyCode: 'USD',
            total: { amount, label },
          }),
        )
        if (!googlePay.attach) throw new Error('Google Pay unavailable')
        await googlePay.attach(`#${containerId}-google-pay`, {
          buttonColor: 'black',
          buttonType: 'long',
          buttonSizeMode: 'fill',
        })
        if (cancelled) {
          await googlePay.destroy().catch(() => undefined)
        } else {
          googlePayRef.current = googlePay
          setGooglePayReady(true)
        }
      } catch (err) {
        console.info('Google Pay not available on this device/domain', err)
      } finally {
        if (!cancelled) setGooglePayTried(true)
      }

      try {
        const applePay = await payments.applePay(
          payments.paymentRequest({
            countryCode: 'US',
            currencyCode: 'USD',
            total: { amount, label },
          }),
        )
        if (cancelled) {
          await applePay.destroy().catch(() => undefined)
        } else {
          applePayRef.current = applePay
          setApplePayReady(true)
        }
      } catch (err) {
        console.info('Apple Pay not available on this device/domain', err)
      }
    }

    setupWallets().catch(() => undefined)
    return () => {
      cancelled = true
      applePayRef.current?.destroy().catch(() => undefined)
      applePayRef.current = null
      googlePayRef.current?.destroy().catch(() => undefined)
      googlePayRef.current = null
      setApplePayReady(false)
      setGooglePayReady(false)
      setGooglePayTried(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadSquareSdk closes over config
  }, [open, step, config, containerId, needsCard, cardDue, title])

  useEffect(() => {
    if (!needsCard) setError('')
  }, [needsCard])

  async function ensureParentNameSaved() {
    if (!needsName) return
    const first = firstName.trim()
    const last = lastName.trim()
    if (!first || !last) {
      throw new Error('Enter your first and last name before paying.')
    }
    const profileRes = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: first, lastName: last }),
    })
    const profileData = await profileRes.json().catch(() => ({}))
    if (!profileRes.ok) {
      throw new Error(profileData.error || 'Could not save your name.')
    }
    setNeedsName(false)
  }

  async function submit(opts?: {
    sourceId?: string
    paymentType?: 'square_card' | 'square_card_on_file' | 'square_wallet'
  }) {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      if (needsConsent && (!consentComplete || !consents)) {
        throw new Error('Please review and accept the required terms before paying.')
      }
      await ensureParentNameSaved()
      let sourceId = opts?.sourceId
      if (needsCard && !useStored && !sourceId) {
        if (!cardRef.current || !ready) throw new Error('Card form is not ready yet.')
        const tokenized = await cardRef.current.tokenize()
        if (tokenized.status !== 'OK' || !tokenized.token) {
          throw new Error(tokenized.errors?.[0]?.message ?? 'Card details could not be verified.')
        }
        sourceId = tokenized.token
      }

      const response = await fetch('/api/checkout/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payBody,
          couponCode: couponCode.trim() || undefined,
          useCoveBalance: coveSplitKind ? useCove : false,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          consents: needsConsent ? consents : undefined,
          sourceId,
          useStoredCard: needsCard && useStored && !opts?.sourceId,
          saveCard: needsCard && !useStored && !opts?.sourceId && saveCard,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Payment failed.')

      const conf = data.confirmation as
        | { nextSteps?: string[]; portalHref?: string; emailed?: boolean }
        | undefined
      setNextSteps(Array.isArray(conf?.nextSteps) ? conf.nextSteps : [])
      setPortalHref(typeof conf?.portalHref === 'string' ? conf.portalHref : '/member-portal')
      setEmailed(Boolean(conf?.emailed))
      setSuccess('Payment successful. Thank you!')
      trackCheckoutPurchase({
        data,
        amount,
        title,
        payBody,
        paymentType:
          opts?.paymentType ??
          (useStored ? 'square_card_on_file' : 'square_card'),
      })
      onPaid?.(data)
      if (!isPage) {
        setTimeout(() => onClose(), conf?.nextSteps?.length ? 6000 : 1400)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed.')
    } finally {
      setBusy(false)
    }
  }

  async function payWithWallet(wallet: SquareWallet | null) {
    if (!wallet || busy || success || payDisabled) return
    setError('')
    if (needsConsent && (!consentComplete || !consents)) {
      setError('Please review and accept the required terms before paying.')
      return
    }
    // Apple Pay requires tokenize() as the first await after the click — no prior API calls.
    let sourceId: string
    try {
      const tokenized = await wallet.tokenize()
      if (tokenized.status !== 'OK' || !tokenized.token) {
        throw new Error(tokenized.errors?.[0]?.message ?? 'Wallet payment was cancelled.')
      }
      sourceId = tokenized.token
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet payment failed.')
      return
    }
    try {
      await ensureParentNameSaved()
      await submit({ sourceId, paymentType: 'square_wallet' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet payment failed.')
    }
  }

  const reviewReady =
    nameReady && (!needsConsent || consentComplete) && !productAwaitingQuote
  const payDisabled =
    busy ||
    (needsCard && (!config?.configured || (!useStored && !ready))) ||
    (needsConsent && !consentComplete) ||
    !nameReady

  if (!open) return null

  const listAmount = Number(quote?.listAmount ?? due)
  const upgradeCredit =
    listAmount > due + 0.001 ? Math.round((listAmount - due) * 100) / 100 : 0
  const totalDueNow = needsCard ? cardDue : 0
  const showBreakdown = coveDue > 0 || upgradeCredit > 0 || Boolean(quote?.discountPercent)
  const sectionLabel = 'text-[10px] font-semibold uppercase tracking-wide text-[#5A6070]'

  const coveOptIn =
    coveSplitKind && (quote?.coveBalance ?? 0) > 0 ? (
      <label className="flex items-start gap-2.5 text-xs text-[#1A1A1A] rounded-xl border border-[var(--border)] bg-[var(--brand-warm)]/35 px-3 py-2.5">
        <input
          type="checkbox"
          checked={useCove}
          onChange={(e) => setUseCove(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Apply Cove balance (${Number(quote?.coveBalance ?? 0).toFixed(2)} available).
          Optional — reduces the amount charged on card.
        </span>
      </label>
    ) : null

  const nameFields = needsName ? (
    <div className="grid grid-cols-2 gap-2">
      <label className="block text-xs font-medium text-[#5A6070]">
        First name
        <input
          type="text"
          required
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[#1A1A1A]"
        />
      </label>
      <label className="block text-xs font-medium text-[#5A6070]">
        Last name
        <input
          type="text"
          required
          autoComplete="family-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[#1A1A1A]"
        />
      </label>
    </div>
  ) : null

  const orderSummary = (
    <div className="rounded-xl border border-[var(--border)] bg-[#FAFAF8] px-3 py-2.5 space-y-1.5 text-xs">
      <div className="flex justify-between gap-3 text-[#5A6070]">
        <span>Subtotal</span>
        <span className="tabular-nums">${(upgradeCredit > 0 ? listAmount : due).toFixed(2)}</span>
      </div>
      {upgradeCredit > 0 ? (
        <div className="flex justify-between gap-3 text-[#5A6070]">
          <span>{payBody.kind === 'membership' ? 'Upgrade credit' : 'Credit'}</span>
          <span className="tabular-nums">−${upgradeCredit.toFixed(2)}</span>
        </div>
      ) : null}
      {quote?.discountPercent ? (
        <div className="flex justify-between gap-3 text-[#5A6070]">
          <span>
            Discount{quote.discountCode ? ` (${quote.discountCode})` : ''}
          </span>
          <span className="tabular-nums">{quote.discountPercent}% off</span>
        </div>
      ) : null}
      {coveDue > 0 ? (
        <div className="flex justify-between gap-3 text-[#5A6070]">
          <span>Cove balance</span>
          <span className="tabular-nums">−${coveDue.toFixed(2)}</span>
        </div>
      ) : null}
      <div className="flex justify-between gap-3 pt-1.5 border-t border-[var(--border)] font-bold text-[#1A1A1A]">
        <span>Total due now</span>
        <span className="tabular-nums" style={{ color: 'var(--brand-green)' }}>
          ${totalDueNow.toFixed(2)}
        </span>
      </div>
    </div>
  )

  const panel = (
      <div
        className={
          isPage
            ? 'flex w-full flex-col rounded-2xl bg-white shadow-sm border border-[var(--border)]'
            : 'flex w-full max-w-md max-h-[min(92dvh,720px)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl border border-[var(--border)]'
        }
      >
        {/* Header: one title + amount due now */}
        <div className="shrink-0 border-b border-[var(--border)] px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className={sectionLabel}>
                {step === 'review' ? 'Step 1 of 2 · Review' : 'Step 2 of 2 · Pay'}
              </p>
              <p id={`${containerId}-title`} className="text-base font-bold text-[#1A1A1A] leading-snug">
                {title}
              </p>
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--brand-green)' }}>
                ${totalDueNow.toFixed(2)}
                <span className="ml-1.5 text-xs font-semibold text-[#5A6070]">
                  {needsCard ? 'due now' : 'covered by Cove'}
                </span>
              </p>
            </div>
            {!isPage ? (
              <button type="button" onClick={onClose} aria-label="Close checkout" className="p-1">
                <X className="w-4 h-4 text-[#5A6070]" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Modal: inner scroll. Page: document scroll (nested overflow traps the wheel). */}
        <div
          className={
            isPage
              ? 'px-4 py-3 space-y-3'
              : 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3'
          }
        >
          {step === 'review' ? (
            <>
              {subtitle ? (
                <p className="text-xs text-[#5A6070] leading-snug">{subtitle}</p>
              ) : null}

              {showBreakdown || productAwaitingQuote ? orderSummary : null}

              {payBody.kind === 'product' || payBody.kind === 'program' ? (
                <label className="block text-xs font-medium text-[#5A6070]">
                  Discount code
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      const next = e.target.value.toUpperCase()
                      setCouponCode(next)
                      setStoredCouponCode(next)
                    }}
                    placeholder="Optional"
                    autoComplete="off"
                    className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm font-mono font-normal tracking-wide uppercase"
                  />
                  {quote?.error ? (
                    <span className="mt-1 block text-[11px] text-red-600">{quote.error}</span>
                  ) : null}
                </label>
              ) : null}

              {coveOptIn}
              {nameFields}

              {showConsentUi ? (
                <CheckoutConsent
                  kind={consentKind}
                  kinds={cartConsentKinds}
                  onChange={onConsentChange}
                />
              ) : null}
            </>
          ) : (
            <>
              {showBreakdown || productAwaitingQuote ? orderSummary : null}

              {express ? coveOptIn : null}
              {express ? nameFields : null}

              {express && showConsentUi ? (
                <CheckoutConsent
                  kind={consentKind}
                  kinds={cartConsentKinds}
                  onChange={onConsentChange}
                />
              ) : null}

              {needsCard ? (
                <div className="space-y-3">
                  <p className={sectionLabel}>Express checkout</p>
                  <p className="text-xs text-[#5A6070] -mt-1">
                    One-tap wallets charge the amount due now. Card entry is below if you prefer.
                  </p>

                  <div className="flex flex-col gap-3">
                    {/* Mount targets must stay sized for Square attach (not display:none). */}
                    {applePayReady ? (
                      <button
                        type="button"
                        id={`${containerId}-apple-pay`}
                        disabled={busy || Boolean(success) || payDisabled}
                        onClick={() => void payWithWallet(applePayRef.current)}
                        className="apple-pay-button w-full shrink-0"
                        aria-label={`Apple Pay $${totalDueNow.toFixed(2)}`}
                      />
                    ) : null}
                    <div
                      id={`${containerId}-google-pay`}
                      className={
                        googlePayReady || !googlePayTried
                          ? 'w-full min-h-12 shrink-0 overflow-hidden rounded-md'
                          : 'hidden'
                      }
                      onClick={() => {
                        if (busy || success || payDisabled || !googlePayReady) return
                        void payWithWallet(googlePayRef.current)
                      }}
                    />
                    <div className="w-full shrink-0">
                    <PortalPayPalButtons
                      variant="wallet"
                      active={open && step === 'pay' && !busy && !success && nameReady}
                      requireConsent={false}
                      payBody={{
                        ...payBody,
                        ...(payBody.kind === 'product' || payBody.kind === 'program'
                          ? { couponCode: couponCode.trim() || undefined }
                          : {}),
                        ...(coveSplitKind ? { useCoveBalance: useCove } : {}),
                        consents: needsConsent ? consents ?? undefined : undefined,
                      }}
                      onBeforePay={async () => {
                        await ensureParentNameSaved()
                      }}
                      onPaid={(data) => {
                        const conf = data.confirmation as
                          | { nextSteps?: string[]; portalHref?: string; emailed?: boolean }
                          | undefined
                        setNextSteps(Array.isArray(conf?.nextSteps) ? conf.nextSteps : [])
                        setPortalHref(
                          typeof conf?.portalHref === 'string' ? conf.portalHref : '/member-portal',
                        )
                        setEmailed(Boolean(conf?.emailed))
                        setSuccess('PayPal payment successful. Thank you!')
                        trackCheckoutPurchase({
                          data,
                          amount,
                          title,
                          payBody,
                          paymentType: 'paypal',
                        })
                        onPaid?.(data)
                        if (!isPage) {
                          setTimeout(() => onClose(), conf?.nextSteps?.length ? 6000 : 1400)
                        }
                      }}
                      onError={(message) => setError(message)}
                    />
                    </div>
                  </div>

                  <div className="relative flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-[var(--border)]" />
                    <span className={sectionLabel}>Or pay with card</span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>

                  {storedCard ? (
                    <div className="space-y-2 rounded-xl border border-[var(--border)] px-3 py-2.5">
                      <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
                        <input
                          type="radio"
                          checked={!useStored}
                          onChange={() => setUseStored(false)}
                        />
                        Enter a new card
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
                        <input
                          type="radio"
                          checked={useStored}
                          onChange={() => setUseStored(true)}
                        />
                        Use saved {storedCard.brand} ···{storedCard.last4}
                      </label>
                    </div>
                  ) : null}

                  {!useStored ? (
                    <div
                      id={containerId}
                      className="min-h-12 rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                    />
                  ) : null}

                  {!useStored ? (
                    <label className="flex items-start gap-2 text-xs text-[#5A6070]">
                      <input
                        type="checkbox"
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                        className="mt-0.5"
                      />
                      Save this card for faster checkout later (optional)
                    </label>
                  ) : null}

                  {config && !config.configured ? (
                    <p className="text-xs text-amber-700">Card payments are temporarily unavailable.</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-[#5A6070]">
                  This total is covered by your Cove Digital Card. Confirm below to finish.
                </p>
              )}
            </>
          )}

          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          {success ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-green-800">{success}</p>
              {emailed ? (
                <p className="text-[11px] text-green-800">A confirmation email is on its way.</p>
              ) : (
                <p className="text-[11px] text-green-800">
                  Confirmation is also in Member Portal → Messages.
                </p>
              )}
              {nextSteps.length ? (
                <ul className="text-[11px] text-green-900 space-y-1 list-disc pl-4">
                  {nextSteps.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {portalHref ? (
                <a href={portalHref} className="text-[11px] font-semibold underline text-green-900">
                  Continue in portal
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Footer CTA — card / Cove only; wallets submit themselves */}
        <div className="shrink-0 border-t border-[var(--border)] bg-white px-4 py-3 space-y-2">
          {step === 'review' ? (
            <Button
              type="button"
              onClick={() => {
                setError('')
                setStep('pay')
              }}
              disabled={!reviewReady || Boolean(success)}
              className="w-full text-white font-bold"
              style={{ backgroundColor: 'var(--brand-green)' }}
            >
              Continue to payment
            </Button>
          ) : (
            <div className="flex gap-2">
              {!express ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setError('')
                    setStep('review')
                  }}
                  disabled={busy || Boolean(success)}
                  className="shrink-0"
                  aria-label="Back to review"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={() => void submit()}
                disabled={payDisabled || Boolean(success)}
                className="flex-1 text-white font-bold"
                style={{ backgroundColor: 'var(--brand-green)' }}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {needsCard
                      ? `Pay $${totalDueNow.toFixed(2)} with card`
                      : `Confirm · Cove $${due.toFixed(2)}`}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
  )

  if (isPage) return panel

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${containerId}-title`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {panel}
    </div>
  )
}
