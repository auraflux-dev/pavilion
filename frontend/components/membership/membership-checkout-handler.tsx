'use client'

/**
 * After login return to /membership?checkout=reef&studentId=…
 * opens in-portal Square card pay (own CC. free or paid parent).
 */
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { PortalCardCheckout } from '@/components/checkout/portal-card-checkout'

const TIER_LABELS: Record<string, string> = {
  reef: 'Reef',
  lagoon: 'Lagoon',
  tide: 'Tide',
}

const PRICE_FALLBACK: Record<string, number> = {
  reef: 49,
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

      // Prefer live CMS/catalog prices from the membership page context when possible
      let dollars = PRICE_FALLBACK[checkout] ?? 0
      try {
        const res = await fetch('/api/checkout/quote', {
          method: 'POST',
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
        setOpen(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [status, checkout, studentId])

  if (status !== 'member' || !checkout || !open || price <= 0) return null

  return (
    <PortalCardCheckout
      open={open}
      onClose={() => setOpen(false)}
      amount={price}
      title={`Join ${TIER_LABELS[checkout] ?? checkout}`}
      subtitle="Pay with your own credit or debit card on this page"
      payBody={{ kind: 'membership', tier: checkout, studentId }}
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
