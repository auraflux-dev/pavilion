'use client'

import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MemberGate } from '@/components/member-gate'
import { PortalCardCheckout } from '@/components/checkout/portal-card-checkout'
import {
  normalizeMembershipTier,
  pickHighestTier,
  tierRank,
} from '@/lib/staff/members-roster'
import {
  SHIRT_SIZES,
  tierNeedsShirtSize,
} from '@/lib/membership-entitlements'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

interface Props {
  tierId: string
  tierName: string
  price: number
}

function JoinInner({ tierId, tierName, price }: Props) {
  const searchParams = useSearchParams()
  const studentId = searchParams.get('studentId')
  const [open, setOpen] = useState(false)
  const [currentTier, setCurrentTier] = useState<string | null>(null)
  const [chargeAmount, setChargeAmount] = useState(price)
  const [isUpgrade, setIsUpgrade] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [shirtSize, setShirtSize] = useState('')
  const needsShirt = tierNeedsShirtSize(tierId)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (!res.ok) {
          if (!cancelled) {
            setCurrentTier('free')
            setChargeAmount(price)
            setIsUpgrade(false)
          }
          return
        }
        const data = (await res.json()) as {
          membership?: { tier?: string } | null
          students?: Array<{ membershipTier?: string }>
        }
        const fromStudents = (data.students ?? []).map((s) => s.membershipTier ?? 'free')
        const fromMembership = data.membership?.tier
        const tiers = [
          ...fromStudents,
          ...(fromMembership ? [fromMembership] : []),
        ]
        const highest = tiers.length ? pickHighestTier(tiers) : 'free'
        if (!cancelled) setCurrentTier(highest)

        const quoteRes = await fetch('/api/checkout/quote', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'membership', tier: tierId }),
        })
        const quote = (await quoteRes.json().catch(() => ({}))) as {
          amount?: number
          isUpgrade?: boolean
          error?: string
        }
        if (cancelled) return
        if (!quoteRes.ok) {
          setQuoteError(quote.error || null)
          setChargeAmount(price)
          setIsUpgrade(false)
          return
        }
        setQuoteError(null)
        setChargeAmount(Number(quote.amount ?? price))
        setIsUpgrade(Boolean(quote.isUpgrade))
      } catch {
        if (!cancelled) {
          setCurrentTier('free')
          setChargeAmount(price)
          setIsUpgrade(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tierId, price])

  const target = normalizeMembershipTier(tierId)
  const relation = useMemo(() => {
    if (currentTier == null) return 'loading' as const
    const cur = tierRank(currentTier)
    const next = tierRank(target)
    if (cur >= next && cur > 0) return 'current' as const
    if (cur > 0 && next > cur) return 'upgrade' as const
    return 'join' as const
  }, [currentTier, target])

  if (relation === 'current' || quoteError?.toLowerCase().includes('already have')) {
    return (
      <Button
        className="w-full font-bold"
        variant="outline"
        disabled
        id={`join-${tierId}`}
        type="button"
      >
        Current plan · {tierName}
      </Button>
    )
  }

  const label =
    relation === 'upgrade' || isUpgrade
      ? `Upgrade to ${tierName} · $${chargeAmount.toFixed(0)}`
      : `Join ${tierName} · $${chargeAmount.toFixed(0)}`
  const title =
    relation === 'upgrade' || isUpgrade
      ? `Upgrade to ${tierName}`
      : `Join ${tierName}`
  const subtitle =
    relation === 'upgrade' || isUpgrade
      ? `Pays the upgrade difference ($${chargeAmount.toFixed(0)}). Full ${tierName} list price is $${price.toFixed(0)}.`
      : 'Pay with your own card on this page. Free parent accounts can upgrade here.'

  function startCheckout() {
    if (needsShirt && !shirtSize) return
    setOpen(true)
  }

  return (
    <MemberGate
      label={label}
      returnToQuery={`checkout=${tierId}${studentId ? `&studentId=${studentId}` : ''}`}
    >
      <div className="space-y-2">
        {needsShirt ? (
          <label className="block text-xs text-[#5A6070]">
            Spirit Wear T-shirt size (included with {tierName})
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
        <Button
          className="w-full font-bold text-white group"
          style={{ backgroundColor: '#085508' }}
          id={`join-${tierId}`}
          type="button"
          onClick={startCheckout}
          disabled={relation === 'loading' || (needsShirt && !shirtSize)}
        >
          {relation === 'loading' ? `Join ${tierName}` : label}
          <ArrowRight
            className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Button>
        {needsShirt && !shirtSize ? (
          <p className="text-[11px] text-[#5A6070]">Choose a shirt size to continue.</p>
        ) : null}
        <PortalCardCheckout
          open={open}
          onClose={() => setOpen(false)}
          amount={chargeAmount}
          title={title}
          subtitle={
            needsShirt && shirtSize
              ? `${subtitle} Spirit shirt size: ${shirtSize}.`
              : subtitle
          }
          payBody={{
            kind: 'membership',
            tier: tierId,
            studentId,
            shirtSize: needsShirt ? shirtSize : undefined,
          }}
          containerId={`membership-pay-${tierId}`}
          onPaid={() => {
            sessionStorage.removeItem('pendingMembership')
            window.location.href = '/member-portal?membership=success'
          }}
        />
      </div>
    </MemberGate>
  )
}

export function MembershipJoinButton(props: Props) {
  return (
    <Suspense
      fallback={
        <Button className="w-full font-bold text-white opacity-50" style={{ backgroundColor: '#085508' }} disabled>
          Join {props.tierName}
        </Button>
      }
    >
      <JoinInner {...props} />
    </Suspense>
  )
}
