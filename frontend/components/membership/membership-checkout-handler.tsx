'use client'

/**
 * After login return to /membership?checkout=reef&studentId=…
 * opens in-portal Square card pay (own CC. free or paid parent).
 * Lagoon/Tide require shirt size before pay (same as MembershipJoinButton).
 */
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { PortalCardCheckout } from '@/components/checkout/portal-card-checkout'
import { SHIRT_SIZES, tierNeedsShirtSize } from '@/lib/membership-entitlements'

const TIER_LABELS: Record<string, string> = {
  reef: 'Reef',
  lagoon: 'Lagoon',
  tide: 'Tide',
}

const PRICE_FALLBACK: Record<string, number> = {
  reef: 79,
  lagoon: 149,
  tide: 249,
}

function HandlerInner() {
  const searchParams = useSearchParams()
  const { status } = useAuth()
  const checkout = searchParams.get('checkout')
  const studentId = searchParams.get('studentId')
  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState(0)
  const [shirtSize, setShirtSize] = useState('')
  const [ready, setReady] = useState(false)

  const needsShirt = checkout ? tierNeedsShirtSize(checkout) : false

  useEffect(() => {
    if (status !== 'member') return
    if (!checkout || checkout === 'faculty' || checkout === 'free') return

    let cancelled = false
    ;(async () => {
      try {
        sessionStorage.setItem(
          'pendingMembership',
          JSON.stringify({ tier: checkout, studentId: studentId ?? null, startedAt: Date.now() })
        )
      } catch {
        // ignore
      }

      let dollars = PRICE_FALLBACK[checkout] ?? 0
      try {
        const res = await fetch('/api/checkout/quote', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'membership', tier: checkout }),
        })
        const data = await res.json()
        if (res.ok && typeof data.amount === 'number') dollars = data.amount
      } catch {
        // fallback prices
      }

      if (!cancelled && dollars > 0) {
        setPrice(dollars)
        setReady(true)
        if (!tierNeedsShirtSize(checkout)) setOpen(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [status, checkout, studentId])

  if (status !== 'member' || !checkout || !ready || price <= 0) return null

  const tierName = TIER_LABELS[checkout] ?? checkout

  if (needsShirt && !open) {
    return (
      <div className="mb-6 rounded-xl border border-[#E8E4DC] bg-white p-4 space-y-3">
        <p className="text-sm font-bold text-[#1A1A1A]">Finish joining {tierName}</p>
        <p className="text-xs text-[#5A6070]">
          Choose your included Spirit Wear T-shirt size, then continue to pay.
        </p>
        <label className="block text-xs text-[#5A6070]">
          Spirit Wear T-shirt size
          <select
            value={shirtSize}
            onChange={(e) => setShirtSize(e.target.value)}
            className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2.5 text-sm text-[#1A1A1A] bg-white"
          >
            <option value="">Select size</option>
            {SHIRT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!shirtSize}
          onClick={() => setOpen(true)}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: '#085508' }}
        >
          Continue to pay · ${price.toFixed(0)}
        </button>
      </div>
    )
  }

  return (
    <PortalCardCheckout
      open={open}
      onClose={() => setOpen(false)}
      amount={price}
      title={`Join ${tierName}`}
      subtitle={
        needsShirt && shirtSize
          ? `Pay with your own card. Spirit shirt size: ${shirtSize}.`
          : 'Pay with your own credit or debit card on this page'
      }
      payBody={{
        kind: 'membership',
        tier: checkout,
        studentId,
        shirtSize: needsShirt ? shirtSize : undefined,
      }}
      containerId={`membership-return-${checkout}`}
      onPaid={() => {
        sessionStorage.removeItem('pendingMembership')
        window.location.href = '/member-portal?membership=success'
      }}
    />
  )
}

export function MembershipCheckoutHandler() {
  return (
    <Suspense fallback={null}>
      <HandlerInner />
    </Suspense>
  )
}
