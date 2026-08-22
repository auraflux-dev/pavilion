'use client'

/**
 * In-portal Square card checkout. Personal credit/debit card for any ecommerce.
 * Free and paid members. Saved card is optional convenience, never required.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { CreditCard, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PortalPayPalButtons } from '@/components/checkout/portal-paypal-buttons'
import { CheckoutConsent } from '@/components/checkout/checkout-consent'
import { HelpTip } from '@/components/ui/help-tip'
import type { ConsentAck, CheckoutConsentKind } from '@/lib/checkout-consent'
import { tooltipCopy } from '@/lib/copy/tooltips'
import { useDialogA11y } from '@/lib/hooks/use-dialog-a11y'
import { itemsFromPayBody, trackBeginCheckout, trackCheckoutPurchase } from '@/lib/ga'
import { getStoredCouponCode, setStoredCouponCode } from '@/lib/start-checkout'

type StoredCard = {
  brand: string
  last4: string
}

type SquareCard = {
  attach(selector: string): Promise<void>
  tokenize(): Promise<{ status: string; token?: string; errors?: { message?: string }[] }>
  destroy(): Promise<void>
}

declare global {
  interface Window {
    Square?: {
      payments(applicationId: string, locationId: string): Promise<{
        card(): Promise<SquareCard>
      }>
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
      consents?: ConsentAck[]
    }
  | { kind: 'product'; productId: string; variantId?: string; couponCode?: string | null; useCoveBalance?: boolean; consents?: ConsentAck[] }
  | { kind: 'store-card'; studentId: string; amountCents: number; consents?: ConsentAck[] }
  | {
      kind: 'program'
      programId: string
      studentId: string
      addonProgramIds?: string[]
      couponCode?: string | null
      consents?: ConsentAck[]
    }
  | { kind: 'event'; eventId: string; quantity: number; consents?: ConsentAck[] }
  | { kind: 'donation'; amountCents: number; note?: string; consents?: ConsentAck[] }
  | {
      kind: 'cart'
      cartLines: Exclude<PortalPayBody, { kind: 'cart' | 'store-card' }>[]
      couponCode?: string | null
      useCoveBalance?: boolean
      consents?: ConsentAck[]
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
}: Props) {
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
  const [showCoupon, setShowCoupon] = useState(false)
  const [showPayPal, setShowPayPal] = useState(false)
  const [useCove, setUseCove] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeSafe = useCallback(() => {
    if (!busy) onClose()
  }, [busy, onClose])
  useDialogA11y(open, closeSafe, panelRef)
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

  useEffect(() => {
    if (!open) return
    const stored = getStoredCouponCode()
    if (stored) {
      setCouponCode(stored)
      setShowCoupon(true)
    }
    setShowPayPal(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    if (payBody.kind !== 'product' && payBody.kind !== 'program' && payBody.kind !== 'cart') {
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
          useCoveBalance:
            payBody.kind === 'product' || payBody.kind === 'cart' ? useCove : false,
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
            listAmount: Number(data.listAmount) || undefined,
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
  }, [open, amount, couponCode, useCove, payBody])

  useEffect(() => {
    if (!open) return
    trackBeginCheckout({
      value: amount,
      items: itemsFromPayBody(payBody, title, amount),
    })
    // Intentionally keyed on kind + amount so parent re-renders do not re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, amount, title, payBody.kind])

  const cartConsentKinds: CheckoutConsentKind[] =
    payBody.kind === 'cart'
      ? Array.from(
          new Set(
            payBody.cartLines
              .map((l) => l.kind)
              .filter(
                (k): k is 'membership' | 'program' | 'event' =>
                  k === 'membership' || k === 'program' || k === 'event',
              ),
          ),
        )
      : []
  const consentKind: CheckoutConsentKind =
    payBody.kind === 'cart'
      ? 'cart'
      : payBody.kind === 'membership' || payBody.kind === 'program' || payBody.kind === 'event'
        ? payBody.kind
        : 'product'
  const needsConsent =
    payBody.kind === 'membership' ||
    payBody.kind === 'program' ||
    payBody.kind === 'event' ||
    (payBody.kind === 'cart' && cartConsentKinds.length > 0)
  const showConsentUi = needsConsent && !prefilledConsents?.length
  const due = quote?.amount ?? amount
  /** Wait for product/bag quote before mounting Square; otherwise cardDue falls back to list price and attach races the DOM. */
  const splitAwaitingQuote =
    (payBody.kind === 'product' || payBody.kind === 'cart') && quote == null
  const cardDue =
    payBody.kind === 'product' || payBody.kind === 'cart'
      ? Number(quote?.cardDollars ?? (splitAwaitingQuote ? 0 : due))
      : due
  const coveDue =
    payBody.kind === 'product' || payBody.kind === 'cart'
      ? Number(quote?.coveDollars ?? 0)
      : 0
  const needsCard = !splitAwaitingQuote && cardDue >= 1
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
      .then((r) => r.json())
      .then((data) => {
        setConfig(data)
        const method = data.paymentMethod ?? null
        setStoredCard(method)
        // Prefer typing your own card; saved is an option, not the default gate
        setUseStored(false)
        // First purchase: offer save by default so the card lands on Payment methods.
        setSaveCard(!method)
      })
      .catch(() => setError('Payment settings could not be loaded.'))
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

  useEffect(() => {
    if (!open || !config?.configured || useStored || !needsCard) return
    let cancelled = false
    let attached: SquareCard | null = null

    async function setup() {
      const src =
        config?.environment === 'production'
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

      if (cancelled || !window.Square || !config) return

      // Wait for the card host to exist. Closing the modal mid-load must not attach.
      for (let i = 0; i < 10; i++) {
        if (cancelled) return
        if (document.getElementById(containerId)) break
        await new Promise<void>((r) => requestAnimationFrame(() => r()))
      }
      if (cancelled || !document.getElementById(containerId)) return

      const prev = cardRef.current
      cardRef.current = null
      if (prev) await prev.destroy().catch(() => undefined)

      const payments = await window.Square.payments(config.applicationId, config.locationId)
      if (cancelled) return
      const card = await payments.card()
      if (cancelled) {
        await card.destroy().catch(() => undefined)
        return
      }
      if (!document.getElementById(containerId)) {
        await card.destroy().catch(() => undefined)
        return
      }
      await card.attach(`#${containerId}`)
      if (cancelled) {
        await card.destroy().catch(() => undefined)
        return
      }
      attached = card
      cardRef.current = card
      setReady(true)
    }

    setup().catch((err) => {
      if (cancelled) return
      const raw = err instanceof Error ? err.message : 'Payment form unavailable'
      setError(
        /container element removed/i.test(raw)
          ? 'Card form needed a moment. Close and try again.'
          : raw,
      )
    })
    return () => {
      cancelled = true
      const card = attached || cardRef.current
      attached = null
      cardRef.current = null
      // Destroy while the host div is still mounted (cleanup runs before DOM removal).
      void card?.destroy().catch(() => undefined)
    }
  }, [open, config, useStored, containerId, needsCard])

  useEffect(() => {
    if (!needsCard) setError('')
  }, [needsCard])

  useEffect(() => {
    if (!open) setReady(false)
  }, [open])

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

  async function submit() {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      if (needsConsent && (!consentComplete || !consents)) {
        throw new Error('Please review and accept the required terms before paying.')
      }
      await ensureParentNameSaved()
      let sourceId: string | undefined
      if (needsCard && !useStored) {
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
          useCoveBalance:
            payBody.kind === 'product' || payBody.kind === 'cart' ? useCove : false,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          consents: needsConsent ? consents : undefined,
          sourceId,
          useStoredCard: needsCard && useStored,
          saveCard: needsCard && !useStored && saveCard,
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
      setSuccess(
        `Payment successful.\n${title}\n$${due.toFixed(2)}${subtitle ? `\n${subtitle}` : ''}`,
      )
      trackCheckoutPurchase({
        data,
        amount,
        title,
        payBody,
        paymentType: useStored ? 'square_card_on_file' : 'square_card',
      })
      onPaid?.(data)
      /* receipt stays open until parent closes */
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Payment failed.'
      setError(
        /container element removed/i.test(raw)
          ? 'Card form needed a moment. Close and tap Continue to payment again.'
          : raw,
      )
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const discountLine =
    quote?.listAmount && quote.listAmount > due + 0.001
      ? `Was $${quote.listAmount.toFixed(2)}${
          quote.discountPercent
            ? ` · ${quote.discountPercent}% off${quote.discountCode ? ` (${quote.discountCode})` : ''}`
            : ''
        }`
      : ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${containerId}-title`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy && !success) onClose()
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-[var(--border)] p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p id={`${containerId}-title`} className="text-sm font-bold text-[#1A1A1A] leading-snug line-clamp-2">
              {title}
            </p>
            {subtitle ? <p className="text-xs text-[#5A6070] mt-0.5">{subtitle}</p> : null}
            <p className="text-xl font-bold mt-1" style={{ color: 'var(--brand-green)' }}>
              ${due.toFixed(2)}
            </p>
            {discountLine ? (
              <p className="text-xs text-[#5A6070] mt-0.5">{discountLine}</p>
            ) : null}
            {(payBody.kind === 'product' || payBody.kind === 'cart') && coveDue > 0 ? (
              <p className="text-xs text-[#5A6070] mt-0.5">
                Cove ${coveDue.toFixed(2)}
                {cardDue > 0 ? ` · card $${cardDue.toFixed(2)}` : ''}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close checkout" className="shrink-0 p-1">
            <X className="w-4 h-4 text-[#5A6070]" />
          </button>
        </div>

        {(payBody.kind === 'product' || payBody.kind === 'program') &&
          (showCoupon || couponCode ? (
            <label className="block text-xs font-semibold text-[#5A6070]">
              Discount code
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  const next = e.target.value.toUpperCase()
                  setCouponCode(next)
                  setStoredCouponCode(next)
                }}
                placeholder="Code"
                autoComplete="off"
                className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono font-normal tracking-wide uppercase"
              />
              {quote?.error ? (
                <span className="mt-1 block text-[11px] text-red-600">{quote.error}</span>
              ) : null}
            </label>
          ) : (
            <button
              type="button"
              className="text-xs font-semibold text-[var(--brand-green)] hover:underline text-left"
              onClick={() => setShowCoupon(true)}
            >
              Have a discount code?
            </button>
          ))}

        {(payBody.kind === 'product' || payBody.kind === 'cart') &&
        (quote?.coveBalance ?? 0) > 0 ? (
          <label className="flex items-start gap-2 text-xs text-[#1A1A1A]">
            <input
              type="checkbox"
              checked={useCove}
              onChange={(e) => setUseCove(e.target.checked)}
              className="mt-0.5"
            />
            <span className="whitespace-pre-line">
              {`Use Cove balance first ($${Number(quote?.coveBalance ?? 0).toFixed(2)}).
Applies to this whole bag total.}`}
            </span>
          </label>
        ) : null}

        {needsName ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-[#5A6070]">
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
            <label className="block text-xs text-[#5A6070]">
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
        ) : null}

        {needsCard && storedCard ? (
          <div className="flex flex-wrap gap-3 text-xs text-[#1A1A1A]">
            <label className="inline-flex items-center gap-1.5">
              <input type="radio" checked={!useStored} onChange={() => setUseStored(false)} />
              New card
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="radio" checked={useStored} onChange={() => setUseStored(true)} />
              {storedCard.brand} ···· {storedCard.last4}
            </label>
          </div>
        ) : null}

        {needsCard && !useStored ? (
          <div>
            <p className="mb-1 text-[11px] text-[#5A6070] inline-flex items-center gap-1">
              Card details
              <HelpTip tipKey="checkout.card.security" label="Card security" />
            </p>
            <div
              id={containerId}
              className="min-h-[88px] rounded-lg border border-[var(--border)] bg-white px-2 py-2"
            />
            <label className="mt-2 flex items-start gap-2 text-[11px] text-[#5A6070]">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
                className="mt-0.5"
              />
              Save card for next time
            </label>
          </div>
        ) : null}

        {showConsentUi ? (
          <CheckoutConsent
            kind={consentKind}
            kinds={payBody.kind === 'cart' ? cartConsentKinds : undefined}
            onChange={onConsentChange}
          />
        ) : null}

        {config && !config.configured ? (
          <p className="text-xs text-amber-700">Card payments are temporarily unavailable.</p>
        ) : null}
        {error ? (
          <p className="text-xs text-red-600 whitespace-pre-line">
            {/container element removed/i.test(error)
              ? 'Card form needed a moment. Close and try again.'
              : /could not confirm|ambiguous|network/i.test(error)
                ? tooltipCopy('checkout.ambiguous.failure')
                : error}
          </p>
        ) : null}
        {success ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-green-800 whitespace-pre-line">{success}</p>
            {emailed ? (
              <p className="text-[11px] text-green-800">Confirmation email on the way.</p>
            ) : null}
            {nextSteps.length > 0 ? (
              <ul className="text-[11px] text-green-900 list-disc pl-4 space-y-0.5">
                {nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              {portalHref ? (
                <a
                  href={portalHref}
                  className="inline-flex items-center rounded-lg px-3 py-1.5 text-[11px] font-bold text-white"
                  style={{ backgroundColor: 'var(--brand-green)' }}
                >
                  Continue in portal
                </a>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="text-[11px] font-semibold underline text-green-900"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          onClick={submit}
          disabled={
            busy ||
            (needsCard && (!config?.configured || (!useStored && !ready))) ||
            (needsConsent && !consentComplete) ||
            !nameReady
          }
          className="w-full text-white font-bold"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              {needsCard ? `Pay $${cardDue.toFixed(2)}` : `Pay $${due.toFixed(2)}`}
            </>
          )}
        </Button>

        {needsCard ? (
          showPayPal ? (
            <PortalPayPalButtons
              active={open && !busy && !success && nameReady && (!needsConsent || consentComplete)}
              payBody={{
                ...payBody,
                ...(payBody.kind === 'product' ||
                payBody.kind === 'program' ||
                payBody.kind === 'cart'
                  ? { couponCode: couponCode.trim() || undefined }
                  : {}),
                ...(payBody.kind === 'product' || payBody.kind === 'cart'
                  ? { useCoveBalance: useCove }
                  : {}),
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
                setPortalHref(typeof conf?.portalHref === 'string' ? conf.portalHref : '/member-portal')
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
                /* receipt stays open until parent closes */
              }}
              onError={(message) => setError(message)}
            />
          ) : (
            <button
              type="button"
              className="w-full text-center text-xs font-semibold text-[#5A6070] hover:text-[var(--brand-green)] py-1"
              onClick={() => setShowPayPal(true)}
            >
              Or pay with PayPal
            </button>
          )
        ) : null}

        <p className="text-[10px] text-[#5A6070] text-center">Secured by Square</p>
      </div>
    </div>
  )
}
