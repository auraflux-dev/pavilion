'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CreditCard, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type StoredCard = {
  brand: string
  last4: string
  expMonth: number | null
  expYear: number | null
}

type StoredPayPal = {
  payerEmail: string
}

type SquareConfig = {
  applicationId: string
  locationId: string
  environment: string
}

type SquareCard = {
  attach(selector: string): Promise<void>
  tokenize(): Promise<{ status: string; token?: string; errors?: { message?: string }[] }>
  destroy(): Promise<void>
}

type PayPalButtonsApi = {
  Buttons: (config: {
    style?: { layout?: string; color?: string; shape?: string; label?: string }
    createVaultSetupToken: () => Promise<string>
    onApprove: (data: { vaultSetupToken: string }) => Promise<void>
    onError?: (err: unknown) => void
  }) => { render: (el: HTMLElement) => Promise<void> }
}

export function PaymentMethodsPanel() {
  const [busy, setBusy] = useState(true)
  const [removing, setRemoving] = useState<'card' | 'paypal' | null>(null)
  const [card, setCard] = useState<StoredCard | null>(null)
  const [paypal, setPaypal] = useState<StoredPayPal | null>(null)
  const [configured, setConfigured] = useState(true)
  const [paypalConfigured, setPaypalConfigured] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [paypalReady, setPaypalReady] = useState(false)
  const [squareConfig, setSquareConfig] = useState<SquareConfig | null>(null)
  const [squareReady, setSquareReady] = useState(false)
  const [savingCard, setSavingCard] = useState(false)
  const paypalHostRef = useRef<HTMLDivElement>(null)
  const squareCardRef = useRef<SquareCard | null>(null)

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/gift-card/payment-method')
      const data = await r.json()
      if (!r.ok) {
        setError(data.error || 'Could not load payment methods.')
        setCard(null)
        setPaypal(null)
        return
      }
      setConfigured(Boolean(data.configured))
      setPaypalConfigured(Boolean(data.paypalConfigured))
      setSquareConfig(
        data.applicationId && data.locationId
          ? {
              applicationId: String(data.applicationId),
              locationId: String(data.locationId),
              environment: String(data.environment ?? 'production'),
            }
          : null,
      )
      setCard(data.paymentMethod ?? null)
      setPaypal(data.paypalMethod ?? null)
    } catch {
      setError('Could not load payment methods.')
      setCard(null)
      setPaypal(null)
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (busy || paypal || !paypalConfigured) return
    let cancelled = false

    async function bootVaultButtons() {
      const cfgRes = await fetch('/api/checkout/paypal/config')
      const cfg = await cfgRes.json()
      if (!cfg.configured || !cfg.clientId) return

      const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
        cfg.clientId,
      )}&components=buttons&vault=true&enable-funding=paypal`
      let script = document.querySelector<HTMLScriptElement>(`script[src^="https://www.paypal.com/sdk/js"]`)
      if (!script) {
        script = document.createElement('script')
        script.src = src
        script.async = true
        document.head.appendChild(script)
        await new Promise<void>((resolve, reject) => {
          script!.onload = () => resolve()
          script!.onerror = () => reject(new Error('PayPal failed to load'))
        })
      } else if (!(window as Window & { paypal?: PayPalButtonsApi }).paypal) {
        await new Promise<void>((resolve) => {
          script!.addEventListener('load', () => resolve(), { once: true })
        })
      }

      const paypal = (window as Window & { paypal?: PayPalButtonsApi }).paypal
      if (cancelled || !paypal || !paypalHostRef.current) return
      paypalHostRef.current.innerHTML = ''
      await paypal
        .Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
          createVaultSetupToken: async () => {
            const res = await fetch('/api/gift-card/payment-method', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'paypalSetupToken' }),
            })
            const data = await res.json()
            if (!res.ok || !data.setupToken) {
              throw new Error(data.error || 'Could not start PayPal save')
            }
            return data.setupToken as string
          },
          onApprove: async ({ vaultSetupToken }) => {
            const res = await fetch('/api/gift-card/payment-method', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'paypalPaymentToken', vaultSetupToken }),
            })
            const data = await res.json()
            if (!res.ok) {
              setError(data.error || 'Could not save PayPal')
              return
            }
            setSuccess('PayPal saved for faster checkout.')
            await load()
          },
          onError: (err) => {
            console.error(err)
            setError(err instanceof Error ? err.message : 'PayPal save failed')
          },
        })
        .render(paypalHostRef.current)
      if (!cancelled) setPaypalReady(true)
    }

    bootVaultButtons().catch((err) => {
      console.error(err)
      setError(err instanceof Error ? err.message : 'PayPal save unavailable')
    })

    return () => {
      cancelled = true
      if (paypalHostRef.current) paypalHostRef.current.innerHTML = ''
    }
  }, [busy, paypal, paypalConfigured, load])

  useEffect(() => {
    if (busy || card || !configured || !squareConfig) return
    let cancelled = false

    async function setupSquare() {
      const src =
        squareConfig?.environment === 'sandbox'
          ? 'https://sandbox.web.squarecdn.com/v1/square.js'
          : 'https://web.squarecdn.com/v1/square.js'
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
      } else if (!(window as { Square?: unknown }).Square) {
        await new Promise<void>((resolve) => {
          script!.addEventListener('load', () => resolve(), { once: true })
        })
      }

      const Square = (
        window as Window & {
          Square?: {
            payments(applicationId: string, locationId: string): Promise<{ card(): Promise<SquareCard> }>
          }
        }
      ).Square
      if (cancelled || !Square || !squareConfig) return
      await squareCardRef.current?.destroy().catch(() => undefined)
      const payments = await Square.payments(squareConfig.applicationId, squareConfig.locationId)
      const sqCard = await payments.card()
      await sqCard.attach('#payment-methods-square-card')
      squareCardRef.current = sqCard
      if (!cancelled) setSquareReady(true)
    }

    setupSquare().catch((err) => {
      setError(err instanceof Error ? err.message : 'Card form unavailable')
    })

    return () => {
      cancelled = true
      squareCardRef.current?.destroy().catch(() => undefined)
      squareCardRef.current = null
      setSquareReady(false)
    }
  }, [busy, card, configured, squareConfig])

  async function saveCard() {
    setSavingCard(true)
    setError('')
    setSuccess('')
    try {
      if (!squareCardRef.current || !squareReady) {
        throw new Error('Card form is not ready yet.')
      }
      const tokenized = await squareCardRef.current.tokenize()
      if (tokenized.status !== 'OK' || !tokenized.token) {
        throw new Error(tokenized.errors?.[0]?.message ?? 'Card details could not be verified.')
      }
      const r = await fetch('/api/gift-card/payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: tokenized.token }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Could not save card.')
      setCard(data.paymentMethod ?? null)
      setSuccess('Card saved for faster checkout.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save card.')
    } finally {
      setSavingCard(false)
    }
  }

  async function removeCard() {
    if (!window.confirm('Remove this saved card and turn off auto top-off for all students?')) {
      return
    }
    setRemoving('card')
    setError('')
    setSuccess('')
    try {
      const r = await fetch('/api/gift-card/payment-method?kind=card', { method: 'DELETE' })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(data.error || 'Could not remove card.')
        return
      }
      setCard(null)
      setSuccess('Saved card removed. Auto top-off was turned off.')
    } catch {
      setError('Could not remove card.')
    } finally {
      setRemoving(null)
    }
  }

  async function removePayPal() {
    if (!window.confirm('Remove this saved PayPal from Payment methods?')) {
      return
    }
    setRemoving('paypal')
    setError('')
    setSuccess('')
    try {
      const r = await fetch('/api/gift-card/payment-method?kind=paypal', { method: 'DELETE' })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(data.error || 'Could not remove PayPal.')
        return
      }
      setPaypal(null)
      setSuccess('Saved PayPal removed.')
    } catch {
      setError('Could not remove PayPal.')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white px-4 py-5 sm:px-5 space-y-4">
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--brand-soft)' }}
        >
          <CreditCard className="h-4 w-4" style={{ color: 'var(--brand-green)' }} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[#1A1A1A]">Cards and PayPal on file</h2>
          <p className="mt-1 text-sm text-[#5A6070] whitespace-pre-line">
            {`Square stores your card securely for Cove reloads, membership, spirit wear, and enrichment.
Save a card or PayPal here for one-tap checkout.
SHMS PTO never keeps the full card number.`}
          </p>
        </div>
      </div>

      {busy ? (
        <div className="flex items-center gap-2 text-sm text-[#5A6070]">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--brand-green)' }} />
          Loading…
        </div>
      ) : null}

      {!busy && !configured ? (
        <p className="text-sm text-amber-800">
          Card-on-file setup is temporarily unavailable. You can still pay by entering a card or using
          PayPal at checkout.
        </p>
      ) : null}

      {!busy && configured && card ? (
        <div className="rounded-lg border border-[var(--brand-line)] bg-[#FAFCF9] px-3 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#1A1A1A]">
              {card.brand} ending in {card.last4}
            </p>
            {card.expMonth && card.expYear ? (
              <p className="text-xs text-[#5A6070]">
                Expires {String(card.expMonth).padStart(2, '0')}/{card.expYear}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={removing === 'card'}
            onClick={() => void removeCard()}
            className="text-red-700 border-red-200 hover:bg-red-50"
          >
            {removing === 'card' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Remove
              </>
            )}
          </Button>
        </div>
      ) : null}

      {!busy && configured && !card ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] px-3 py-4 space-y-3">
          <h3 className="text-sm font-bold text-[#1A1A1A]">Add a card</h3>
          <p className="text-sm text-[#5A6070] whitespace-pre-line">
            {`No card saved yet.
Enter a debit or credit card here. Square stores it for later checkouts. This does not charge you.`}
          </p>
          <div
            id="payment-methods-square-card"
            className="min-h-12 rounded-lg border border-[var(--border)] bg-white px-2 py-1"
          />
          {!squareReady ? (
            <p className="text-xs text-[#5A6070]">Loading card form…</p>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={savingCard || !squareReady}
            onClick={() => void saveCard()}
            className="text-white font-semibold"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            {savingCard ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving…
              </>
            ) : (
              'Save card'
            )}
          </Button>
        </div>
      ) : null}

      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <h3 className="text-sm font-bold text-[#1A1A1A]">PayPal</h3>
        {!busy && paypal ? (
          <div className="rounded-lg border border-[var(--brand-line)] bg-[#FAFCF9] px-3 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#1A1A1A]">PayPal</p>
              <p className="text-xs text-[#5A6070]">{paypal.payerEmail}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={removing === 'paypal'}
              onClick={() => void removePayPal()}
              className="text-red-700 border-red-200 hover:bg-red-50"
            >
              {removing === 'paypal' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Remove
                </>
              )}
            </Button>
          </div>
        ) : null}

        {!busy && !paypal && paypalConfigured ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] px-3 py-4 space-y-3">
            <p className="text-sm text-[#1A1A1A] whitespace-pre-line">
              {`Save PayPal here for one-tap checkout.
Or check “Save this PayPal…” the next time you pay with PayPal.`}
            </p>
            {!paypalReady ? (
              <p className="text-xs text-[#5A6070]">Loading PayPal…</p>
            ) : null}
            <div ref={paypalHostRef} />
          </div>
        ) : null}

        {!busy && !paypalConfigured ? (
          <p className="text-sm text-amber-800">PayPal save is temporarily unavailable.</p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm font-semibold text-green-700">{success}</p> : null}
    </div>
  )
}
