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
import type { ConsentAck, CheckoutConsentKind } from '@/lib/checkout-consent'

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
  | { kind: 'product'; productId: string; variantId?: string; consents?: ConsentAck[] }
  | { kind: 'store-card'; studentId: string; amountCents: number; consents?: ConsentAck[] }
  | {
      kind: 'program'
      programId: string
      studentId: string
      consents?: ConsentAck[]
    }
  | { kind: 'event'; eventId: string; quantity: number; consents?: ConsentAck[] }
  | { kind: 'donation'; amountCents: number; note?: string; consents?: ConsentAck[] }

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
  const cardRef = useRef<SquareCard | null>(null)

  const nameReady = !needsName || (firstName.trim().length > 0 && lastName.trim().length > 0)

  const consentKind: CheckoutConsentKind =
    payBody.kind === 'membership' || payBody.kind === 'program' || payBody.kind === 'event'
      ? payBody.kind
      : 'product'
  const needsConsent =
    payBody.kind === 'membership' || payBody.kind === 'program' || payBody.kind === 'event'
  const showConsentUi = needsConsent && !prefilledConsents?.length

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
        setStoredCard(data.paymentMethod ?? null)
        // Prefer typing your own card; saved is an option, not the default gate
        setUseStored(false)
        setSaveCard(false)
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
    if (!open || !config?.configured || useStored) return
    let cancelled = false

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
      await cardRef.current?.destroy().catch(() => undefined)
      const payments = await window.Square.payments(config.applicationId, config.locationId)
      const card = await payments.card()
      await card.attach(`#${containerId}`)
      cardRef.current = card
      setReady(true)
    }

    setup().catch((err) => setError(err instanceof Error ? err.message : 'Payment form unavailable'))
    return () => {
      cancelled = true
      cardRef.current?.destroy().catch(() => undefined)
      cardRef.current = null
      setReady(false)
    }
  }, [open, config, useStored, containerId])

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
      if (!useStored) {
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
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          consents: needsConsent ? consents : undefined,
          sourceId,
          useStoredCard: useStored,
          saveCard: !useStored && saveCard,
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
      onPaid?.(data)
      setTimeout(() => onClose(), conf?.nextSteps?.length ? 6000 : 1400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${containerId}-title`}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-[#E8E4DC] p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p id={`${containerId}-title`} className="text-base font-bold text-[#1A1A1A]">
              {title}
            </p>
            {subtitle ? <p className="text-xs text-[#5A6070] mt-1">{subtitle}</p> : null}
            <p className="text-sm font-bold mt-2" style={{ color: '#085508' }}>
              ${amount.toFixed(2)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close checkout">
            <X className="w-4 h-4 text-[#5A6070]" />
          </button>
        </div>

        <p className="text-xs text-[#5A6070]">
          Pay with your own credit or debit card. Free and paid parent accounts can checkout here.
          You do not need a saved card.
        </p>

        {needsName ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-[#5A6070]">
              First name
              <input
                type="text"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E8E4DC] px-3 py-2 text-sm text-[#1A1A1A]"
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
                className="mt-1 w-full rounded-lg border border-[#E8E4DC] px-3 py-2 text-sm text-[#1A1A1A]"
              />
            </label>
            <p className="col-span-2 text-[11px] text-[#5A6070]">
              We need your name on the membership / purchase record.
            </p>
          </div>
        ) : null}

        {storedCard ? (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
              <input type="radio" checked={!useStored} onChange={() => setUseStored(false)} />
              Enter a card
            </label>
            <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
              <input type="radio" checked={useStored} onChange={() => setUseStored(true)} />
              Use saved {storedCard.brand} ending in {storedCard.last4}
            </label>
          </div>
        ) : null}

        {!useStored ? (
          <>
            <div id={containerId} className="min-h-12 rounded-lg border border-[#E8E4DC] bg-white px-2 py-1" />
            <label className="flex items-start gap-2 text-xs text-[#5A6070]">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
                className="mt-0.5"
              />
              Optionally save this card for faster reloads later (never required).
            </label>
          </>
        ) : null}

        {showConsentUi ? (
          <CheckoutConsent kind={consentKind} onChange={onConsentChange} />
        ) : null}

        {config && !config.configured ? (
          <p className="text-xs text-amber-700">Card payments are temporarily unavailable.</p>
        ) : null}
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
                {nextSteps.map((step) => (
                  <li key={step}>{step}</li>
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

        <Button
          type="button"
          onClick={submit}
          disabled={
            busy ||
            !config?.configured ||
            (!useStored && !ready) ||
            (needsConsent && !consentComplete) ||
            !nameReady
          }
          className="w-full text-white font-bold"
          style={{ backgroundColor: '#085508' }}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay ${amount.toFixed(2)}
            </>
          )}
        </Button>

        <PortalPayPalButtons
          active={open && !busy && !success && nameReady && (!needsConsent || consentComplete)}
          payBody={{
            ...payBody,
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
            onPaid?.(data)
            setTimeout(() => onClose(), conf?.nextSteps?.length ? 6000 : 1400)
          }}
          onError={(message) => setError(message)}
        />

        <p className="text-[10px] text-[#5A6070] text-center">
          Card secured by Square · PayPal processed by PayPal. Free and paid parents can use either.
        </p>
      </div>
    </div>
  )
}
