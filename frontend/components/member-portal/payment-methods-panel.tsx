'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

type StoredCard = {
  brand: string
  last4: string
  expMonth: number | null
  expYear: number | null
}

export function PaymentMethodsPanel() {
  const [busy, setBusy] = useState(true)
  const [removing, setRemoving] = useState(false)
  const [card, setCard] = useState<StoredCard | null>(null)
  const [configured, setConfigured] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/gift-card/payment-method')
      const data = await r.json()
      if (!r.ok) {
        setError(data.error || 'Could not load payment methods.')
        setCard(null)
        return
      }
      setConfigured(Boolean(data.configured))
      setCard(data.paymentMethod ?? null)
    } catch {
      setError('Could not load payment methods.')
      setCard(null)
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function removeCard() {
    if (!window.confirm('Remove this saved card and turn off auto top-off for all students?')) {
      return
    }
    setRemoving(true)
    setError('')
    setSuccess('')
    try {
      const r = await fetch('/api/gift-card/payment-method', { method: 'DELETE' })
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
      setRemoving(false)
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
          <h2 className="text-base font-bold text-[#1A1A1A]">Cards on file</h2>
          <p className="mt-1 text-sm text-[#5A6070] whitespace-pre-line">
            {`Square stores your card securely for Cove reloads, membership, spirit wear, and enrichment.
SHMS PTO never keeps the full card number.
PayPal is available at checkout each time. We do not store a PayPal login.`}
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
            disabled={removing}
            onClick={() => void removeCard()}
            className="text-red-700 border-red-200 hover:bg-red-50"
          >
            {removing ? (
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
          <p className="text-sm text-[#1A1A1A] whitespace-pre-line">
            {`No card saved yet.
On your next Square checkout, leave “Save this card…” checked (default on first purchase).
It will show up here automatically.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/cove">
              <Button
                size="sm"
                className="text-white font-semibold"
                style={{ backgroundColor: 'var(--brand-green)' }}
              >
                {vanillaizeIfDemo('Load Cove Digital Card')}
              </Button>
            </Link>
            <Link href="/cove#spirit">
              <Button size="sm" variant="outline">
                Shop spirit wear
              </Button>
            </Link>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm font-semibold text-green-700">{success}</p> : null}

      <p className="text-xs text-[#5A6070]">
        Prefer to pay with PayPal? Use the PayPal buttons on any checkout. There is nothing to save
        here for PayPal.
      </p>
    </div>
  )
}
