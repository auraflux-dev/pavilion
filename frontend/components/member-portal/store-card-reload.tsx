'use client'

import { useEffect, useRef, useState } from 'react'
import { CreditCard, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PortalPayPalButtons } from '@/components/checkout/portal-paypal-buttons'

type Student = {
  id: string
  firstName: string
  lastName: string
}

type StoredCard = {
  brand: string
  last4: string
  expMonth: number | null
  expYear: number | null
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

interface Props {
  students?: Student[]
  amounts?: number[]
  /** Max whole-dollar load (default 500). */
  maxAmount?: number
  onLoaded?: () => void
  triggerLabel?: string
  triggerClassName?: string
  /** Configured first-load / membership bonus % (reloads are 1:1). */
  bonusPercent?: number
}

export function StoreCardReload({
  students = [],
  amounts = [20, 40, 75],
  maxAmount = 500,
  onLoaded,
  triggerLabel = 'Load Cove Digital Card',
  triggerClassName = '',
  bonusPercent = 10,
}: Props) {
  const [studentList, setStudentList] = useState(students)
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [amount, setAmount] = useState(amounts[0] ?? 10)
  const [customAmount, setCustomAmount] = useState('')
  const [appliedBonus, setAppliedBonus] = useState(0)
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
  const cardRef = useRef<SquareCard | null>(null)

  useEffect(() => {
    if (!open) return
    if (!students.length) {
      fetch('/api/students')
        .then((r) => r.json())
        .then((data) => {
          const loaded = data.students ?? []
          setStudentList(loaded)
          setStudentId((current) => current || loaded[0]?.id || '')
        })
        .catch(() => setError('Students could not be loaded.'))
    }
    fetch('/api/gift-card/payment-method')
      .then((r) => r.json())
      .then((data) => {
        setConfig(data)
        setStoredCard(data.paymentMethod ?? null)
        // Own CC first. Saved card is optional, never required
        setUseStored(false)
      })
      .catch(() => setError('Payment settings could not be loaded.'))
  }, [open])

  useEffect(() => {
    if (!open) {
      setAppliedBonus(0)
      return
    }
    let cancelled = false
    fetch('/api/gift-card/bonus')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setAppliedBonus(Number(data.bonusPercent ?? 0) || 0)
      })
      .catch(() => {
        if (!cancelled) setAppliedBonus(0)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open || !config?.configured || (storedCard && useStored)) return
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
      await card.attach('#square-card-container')
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
  }, [open, config, storedCard, useStored])

  async function submit() {
    const loadStudentId = studentId || studentList[0]?.id || ''
    if (!loadStudentId) {
      setError('Add a student in the portal before loading the Cove Digital Card.')
      return
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > maxAmount) {
      setError(`Enter a whole-dollar amount from $1 to $${maxAmount}.`)
      return
    }
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      let sourceId: string | undefined
      if (!useStored) {
        if (!cardRef.current || !ready) throw new Error('Card form is not ready yet.')
        const tokenized = await cardRef.current.tokenize()
        if (tokenized.status !== 'OK' || !tokenized.token) {
          throw new Error(tokenized.errors?.[0]?.message ?? 'Card details could not be verified.')
        }
        sourceId = tokenized.token
      }

      const response = await fetch('/api/gift-card/reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: loadStudentId,
          amountCents: amount * 100,
          sourceId,
          useStoredCard: useStored,
          saveCard: !useStored && saveCard,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Payment failed.')

      const loadedBonus = Number(data.bonusPercent ?? appliedBonus) || 0
      setAppliedBonus(0)
      setSuccess(
        data.newBalance == null
          ? `$${amount} paid${
              loadedBonus > 0
                ? ` · $${(amount * (1 + loadedBonus / 100)).toFixed(2).replace(/\.00$/, '')} loaded`
                : ' loaded'
            } successfully.`
          : `Loaded successfully. New balance: $${Number(data.newBalance).toFixed(2)}`
      )
      if (data.paymentMethod) {
        setStoredCard(data.paymentMethod)
        setUseStored(true)
      }
      onLoaded?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed.')
    } finally {
      setBusy(false)
    }
  }

  async function removeStoredCard() {
    if (!window.confirm('Remove this saved card and turn off auto top-off for all students?')) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/gift-card/payment-method', { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not remove saved card.')
      setStoredCard(null)
      setUseStored(false)
      setSuccess('Saved card removed. Auto top-off was turned off.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove saved card.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg text-white disabled:opacity-50 ${triggerClassName}`}
        style={{ backgroundColor: '#085508' }}
      >
        <CreditCard className="w-3.5 h-3.5" /> {triggerLabel}
      </button>
    )
  }

  return (
    <div className="w-full rounded-xl border border-[#D4E8D4] bg-[#FAFCF9] p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[#1A1A1A]">Load the family Cove Digital Card</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close reload form">
          <X className="w-4 h-4 text-[#5A6070]" />
        </button>
      </div>

      {studentList.length > 1 ? (
        <p className="text-[11px] text-[#5A6070]">
          One card and one balance for your family
          {studentList.length
            ? ` (${studentList.map((s) => s.firstName).filter(Boolean).join(', ')})`
            : ''}
          .
        </p>
      ) : null}

      {/* Keep studentId for payment attribution; UI no longer asks parents to pick a card. */}
      {studentList.length === 0 ? (
        <p className="text-xs text-amber-700">Add a student in the portal before loading the Cove Digital Card.</p>
      ) : null}

      <div>
        <p className="text-xs font-semibold text-[#5A6070] mb-1.5">Amount you pay</p>
        <div className="flex flex-wrap gap-2">
          {amounts.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setAmount(value)
                setCustomAmount('')
              }}
              className={`min-w-[3.5rem] rounded-lg border-2 px-2 py-2 text-sm font-bold ${
                amount === value && !customAmount
                  ? 'border-[#085508] bg-[#EEF6EE] text-[#085508]'
                  : 'border-[#E8E4DC] bg-white text-[#5A6070]'
              }`}
            >
              ${value}
            </button>
          ))}
        </div>
        <label className="mt-2 block text-[11px] text-[#5A6070]">
          Or enter any whole dollar up to ${maxAmount}
          <input
            type="number"
            min={1}
            max={maxAmount}
            step={1}
            value={customAmount}
            onChange={(event) => {
              const raw = event.target.value
              setCustomAmount(raw)
              const n = parseInt(raw, 10)
              if (Number.isInteger(n) && n >= 1 && n <= maxAmount) setAmount(n)
            }}
            placeholder={`e.g. 75`}
            className="mt-1 w-full px-3 py-2 text-sm border border-[#E8E4DC] rounded-lg bg-white"
          />
        </label>
        {appliedBonus > 0 ? (
          <p className="mt-2 text-[11px] text-[#085508] font-semibold">
            First-load bonus: pay ${amount} · get $
            {(amount * (1 + appliedBonus / 100)).toFixed(2).replace(/\.00$/, '')} on the Cove Digital Card (
            {appliedBonus}%). Reloads after this are dollar-for-dollar.
          </p>
        ) : bonusPercent > 0 ? (
          <p className="mt-2 text-[11px] text-[#5A6070]">
            Reloads are dollar-for-dollar. The {bonusPercent}% bonus applies only on your family&apos;s
            first load (or membership Cove credit).
          </p>
        ) : null}
      </div>

      {storedCard ? (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
            <input
              type="radio"
              checked={useStored}
              onChange={() => setUseStored(true)}
            />
            Use saved {storedCard.brand} ending in {storedCard.last4}
          </label>
          <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
            <input
              type="radio"
              checked={!useStored}
              onChange={() => setUseStored(false)}
            />
            Enter my credit or debit card
          </label>
          <button
            type="button"
            onClick={removeStoredCard}
            disabled={busy}
            className="text-[11px] font-semibold text-red-600 hover:underline"
          >
            Remove saved card
          </button>
        </div>
      ) : null}

      {!useStored ? (
        <>
          <div id="square-card-container" className="min-h-12 rounded-lg bg-white" />
          <label className="flex items-start gap-2 text-xs text-[#5A6070]">
            <input
              type="checkbox"
              checked={saveCard}
              onChange={(event) => setSaveCard(event.target.checked)}
              className="mt-0.5"
            />
            Save this card securely for future reloads and optional auto top-off.
            SHMS PTO never stores the card number.
          </label>
        </>
      ) : null}

      {config && !config.configured ? (
        <p className="text-xs text-amber-700">
          Online card-on-file setup is awaiting Square application configuration.
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {success ? <p className="text-xs font-semibold text-green-700">{success}</p> : null}

      <Button
        type="button"
        onClick={submit}
        disabled={
          busy ||
          !config?.configured ||
          !studentId ||
          (!useStored && !ready)
        }
        className="w-full text-white font-bold"
        style={{ backgroundColor: '#085508' }}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : appliedBonus > 0 ? (
          `Pay $${amount} with card · load $${(amount * (1 + appliedBonus / 100)).toFixed(2).replace(/\.00$/, '')}`
        ) : (
          `Pay & load $${amount} with card`
        )}
      </Button>

      {studentId ? (
        <PortalPayPalButtons
          active={!busy}
          payBody={{ kind: 'store-card', studentId, amountCents: amount * 100 }}
          onPaid={(data) => {
            const loadedBonus = Number(data.bonusPercent ?? appliedBonus) || 0
            setAppliedBonus(0)
            setSuccess(
              data.newBalance == null
                ? `PayPal paid $${amount}${
                    loadedBonus > 0
                      ? ` · $${(amount * (1 + loadedBonus / 100)).toFixed(2).replace(/\.00$/, '')} loaded`
                      : ' loaded'
                  }.`
                : `PayPal paid. New balance: $${Number(data.newBalance).toFixed(2)}`
            )
            onLoaded?.()
          }}
          onError={(msg) => setError(msg)}
        />
      ) : null}

      <p className="text-[10px] text-[#5A6070] text-center">
        Pay with credit/debit card or PayPal. One family Cove Digital Card and balance. {bonusPercent}% on
        first load or membership credit only. Reloads are 1:1. Saving a payment card is optional.
      </p>
    </div>
  )
}
