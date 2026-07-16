'use client'

import { useEffect, useRef, useState } from 'react'
import { CreditCard, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  onLoaded?: () => void
  triggerLabel?: string
  triggerClassName?: string
}

export function StoreCardReload({
  students = [],
  amounts = [10, 20, 25],
  onLoaded,
  triggerLabel = 'Load card',
  triggerClassName = '',
}: Props) {
  const [studentList, setStudentList] = useState(students)
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [amount, setAmount] = useState(amounts[0] ?? 10)
  const [config, setConfig] = useState<{
    configured: boolean
    applicationId: string
    locationId: string
    environment: string
  } | null>(null)
  const [storedCard, setStoredCard] = useState<StoredCard | null>(null)
  const [useStored, setUseStored] = useState(true)
  const [saveCard, setSaveCard] = useState(true)
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
        setUseStored(Boolean(data.paymentMethod))
      })
      .catch(() => setError('Payment settings could not be loaded.'))
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
    if (!studentId) {
      setError('Choose a student first.')
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
          studentId,
          amountCents: amount * 100,
          sourceId,
          useStoredCard: useStored,
          saveCard: !useStored && saveCard,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Payment failed.')

      setSuccess(
        data.newBalance == null
          ? `$${amount} was loaded successfully.`
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
        <p className="text-sm font-bold text-[#1A1A1A]">Load a student store card</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close reload form">
          <X className="w-4 h-4 text-[#5A6070]" />
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#5A6070] mb-1">Student</label>
        <select
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
          className="w-full px-3 py-2 text-sm border border-[#E8E4DC] rounded-lg bg-white"
        >
          {studentList.map((student) => (
            <option key={student.id} value={student.id}>
              {student.firstName} {student.lastName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs font-semibold text-[#5A6070] mb-1.5">Amount</p>
        <div className="flex gap-2">
          {amounts.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAmount(value)}
              className={`flex-1 rounded-lg border-2 py-2 text-sm font-bold ${
                amount === value
                  ? 'border-[#085508] bg-[#EEF6EE] text-[#085508]'
                  : 'border-[#E8E4DC] bg-white text-[#5A6070]'
              }`}
            >
              ${value}
            </button>
          ))}
        </div>
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
            Use a different card
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
            Save this card securely with Square for future reloads and optional auto top-off.
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
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pay & load $${amount}`}
      </Button>
      <p className="text-[10px] text-[#5A6070] text-center">
        Secure payment and card vault provided by Square.
      </p>
    </div>
  )
}
