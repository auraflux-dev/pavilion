'use client'

/**
 * After login return to /membership?checkout=reef|lagoon|tide|faculty&…
 * Lagoon/Tide: shirt size (parents get shirt + magnet).
 * Faculty: choose magnet OR shirt, then pay $20.
 */
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { PortalCardCheckout } from '@/components/checkout/portal-card-checkout'
import {
  SHIRT_SIZES,
  tierNeedsShirtSize,
  tierOffersPhysicalPerkChoice,
  type PhysicalPerkChoice,
} from '@/lib/membership-entitlements'

const TIER_LABELS: Record<string, string> = {
  reef: 'Reef',
  lagoon: 'Lagoon',
  tide: 'Tide',
  faculty: 'Faculty',
}

const PRICE_FALLBACK: Record<string, number> = {
  reef: 79,
  lagoon: 149,
  tide: 249,
  faculty: 20,
}

function HandlerInner() {
  const searchParams = useSearchParams()
  const { status } = useAuth()
  const checkout = searchParams.get('checkout')
  const studentId = searchParams.get('studentId')
  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState(0)
  const [shirtSize, setShirtSize] = useState('')
  const [physicalPerk, setPhysicalPerk] = useState<PhysicalPerkChoice | ''>('')
  const [ready, setReady] = useState(false)

  const needsFacultyChoice = checkout ? tierOffersPhysicalPerkChoice(checkout) : false
  const needsParentShirt = checkout ? tierNeedsShirtSize(checkout) : false
  const needsShirtSize =
    needsParentShirt || (needsFacultyChoice && physicalPerk === 'spirit_shirt')
  const choiceReady = needsFacultyChoice
    ? physicalPerk === 'magnet' || (physicalPerk === 'spirit_shirt' && !!shirtSize)
    : !needsParentShirt || !!shirtSize

  useEffect(() => {
    if (status !== 'member') return
    if (!checkout || checkout === 'free') return

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
        if (!needsParentShirt && !needsFacultyChoice) setOpen(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [status, checkout, studentId, needsParentShirt, needsFacultyChoice])

  if (status !== 'member' || !checkout || !ready || price <= 0) return null

  const tierName = TIER_LABELS[checkout] ?? checkout

  if ((needsParentShirt || needsFacultyChoice) && !open) {
    return (
      <div className="mb-6 rounded-xl border border-[#E8E4DC] bg-white p-4 space-y-3">
        <p className="text-sm font-bold text-[#1A1A1A]">Finish joining {tierName}</p>
        {needsFacultyChoice ? (
          <>
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-[#5A6070]">
                Included perk — choose one
              </legend>
              <label className="flex items-start gap-2 text-sm text-[#1A1A1A] cursor-pointer">
                <input
                  type="radio"
                  name={`return-perk-${checkout}`}
                  className="mt-1"
                  checked={physicalPerk === 'magnet'}
                  onChange={() => {
                    setPhysicalPerk('magnet')
                    setShirtSize('')
                  }}
                />
                <span>
                  <span className="font-semibold">Stone Hill car magnet</span>
                  <span className="block text-xs text-[#5A6070]">About $10 value</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-[#1A1A1A] cursor-pointer">
                <input
                  type="radio"
                  name={`return-perk-${checkout}`}
                  className="mt-1"
                  checked={physicalPerk === 'spirit_shirt'}
                  onChange={() => setPhysicalPerk('spirit_shirt')}
                />
                <span>
                  <span className="font-semibold">Spirit Wear T-shirt</span>
                  <span className="block text-xs text-[#5A6070]">About $18 value</span>
                </span>
              </label>
            </fieldset>
          </>
        ) : (
          <p className="text-xs text-[#5A6070]">
            Choose your included Spirit Wear T-shirt size (Lagoon and Tide also include a car magnet), then continue to pay.
          </p>
        )}
        {needsShirtSize ? (
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
        ) : null}
        <button
          type="button"
          disabled={!choiceReady}
          onClick={() => setOpen(true)}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: '#085508' }}
        >
          Continue to pay · ${price.toFixed(0)}
        </button>
      </div>
    )
  }

  const perkNote = needsFacultyChoice
    ? physicalPerk === 'spirit_shirt' && shirtSize
      ? `Pay with your own card. Faculty perk: Spirit Wear T-shirt (${shirtSize}).`
      : physicalPerk === 'magnet'
        ? 'Pay with your own card. Faculty perk: Stone Hill car magnet.'
        : 'Pay with your own credit or debit card on this page'
    : needsParentShirt && shirtSize
      ? `Pay with your own card. Spirit shirt size: ${shirtSize}.`
      : 'Pay with your own credit or debit card on this page'

  return (
    <PortalCardCheckout
      open={open}
      onClose={() => setOpen(false)}
      amount={price}
      title={`Join ${tierName}`}
      subtitle={perkNote}
      payBody={{
        kind: 'membership',
        tier: checkout,
        studentId,
        shirtSize: needsShirtSize ? shirtSize : undefined,
        physicalPerk: needsFacultyChoice ? (physicalPerk || null) : undefined,
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
