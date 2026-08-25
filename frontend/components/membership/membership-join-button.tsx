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
  MembershipShirtPicker,
  type MembershipShirtSelection,
} from '@/components/membership/membership-shirt-picker'
import { tierNeedsShirtSize } from '@/lib/membership-entitlements'
import { useLiveCommerceGate } from '@/lib/demo/commons-surface-context'
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
  const [listPrice, setListPrice] = useState(price)
  const [currentListPrice, setCurrentListPrice] = useState(0)
  const [quotedCurrentTier, setQuotedCurrentTier] = useState<string | null>(null)
  const [isUpgrade, setIsUpgrade] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [shirt, setShirt] = useState<MembershipShirtSelection | null>(null)
  const needsShirt = tierNeedsShirtSize(tierId)
  const { allowed, loading: commerceLoading, note } = useLiveCommerceGate()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (!res.ok) {
          if (!cancelled) {
            setCurrentTier('free')
            setChargeAmount(price)
            setListPrice(price)
            setCurrentListPrice(0)
            setQuotedCurrentTier(null)
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
          listPrice?: number
          currentListPrice?: number
          currentTier?: string
          isUpgrade?: boolean
          error?: string
        }
        if (cancelled) return
        if (!quoteRes.ok) {
          setQuoteError(quote.error || null)
          setChargeAmount(price)
          setIsUpgrade(false)
          setListPrice(price)
          setCurrentListPrice(0)
          setQuotedCurrentTier(null)
          return
        }
        setQuoteError(null)
        setChargeAmount(Number(quote.amount ?? price))
        setListPrice(Number(quote.listPrice ?? price))
        setCurrentListPrice(Number(quote.currentListPrice ?? 0))
        setQuotedCurrentTier(quote.currentTier ? String(quote.currentTier) : null)
        setIsUpgrade(Boolean(quote.isUpgrade))
      } catch {
        if (!cancelled) {
          setCurrentTier('free')
          setChargeAmount(price)
          setListPrice(price)
          setCurrentListPrice(0)
          setQuotedCurrentTier(null)
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

  if (!allowed && !commerceLoading) {
    return (
      <p className="text-xs text-[#5A6070] whitespace-pre-line">
        {note || 'Online membership checkout stays off until Square is connected.'}
      </p>
    )
  }

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

  const showUpgrade = isUpgrade || (relation === 'upgrade' && currentListPrice > 0)
  const creditTierLabel = quotedCurrentTier
    ? quotedCurrentTier.charAt(0).toUpperCase() + quotedCurrentTier.slice(1)
    : currentTier && currentTier !== 'free'
      ? currentTier.charAt(0).toUpperCase() + currentTier.slice(1)
      : 'current'
  const label = showUpgrade
    ? `Upgrade to ${tierName} · $${chargeAmount.toFixed(0)}`
    : `Join ${tierName} · $${chargeAmount.toFixed(0)}`
  const title = showUpgrade ? `Upgrade to ${tierName}` : `Join ${tierName}`
  const subtitle = showUpgrade
    ? `Pays the upgrade difference ($${chargeAmount.toFixed(0)}) after crediting your $${currentListPrice.toFixed(0)} ${creditTierLabel}. Full ${tierName} list price is $${listPrice.toFixed(0)}.`
    : 'Pay with your own card on this page. Free parent accounts can upgrade here.'

  function startCheckout() {
    if (needsShirt && !shirt) return
    setOpen(true)
  }

  return (
    <MemberGate
      label={label}
      returnToQuery={`checkout=${tierId}${studentId ? `&studentId=${studentId}` : ''}`}
    >
      <div className="space-y-2">
        <MembershipShirtPicker required={needsShirt} value={shirt} onChange={setShirt} />
        <Button
          className="w-full font-bold text-white group"
          style={{ backgroundColor: 'var(--brand-green)' }}
          id={`join-${tierId}`}
          type="button"
          onClick={startCheckout}
          disabled={relation === 'loading' || (needsShirt && !shirt)}
        >
          {relation === 'loading' ? `Join ${tierName}` : label}
          <ArrowRight
            className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Button>
        {needsShirt && !shirt ? (
          <p className="text-[11px] text-[#5A6070]">Choose a design and size to continue.</p>
        ) : null}
        <PortalCardCheckout
          open={open}
          onClose={() => setOpen(false)}
          amount={chargeAmount}
          title={title}
          subtitle={
            needsShirt && shirt ? `${subtitle} Spirit shirt: ${shirt.label}.` : subtitle
          }
          payBody={{
            kind: 'membership',
            tier: tierId,
            studentId,
            shirtSize: needsShirt ? shirt?.size : undefined,
            shirtDesign: needsShirt ? shirt?.design : undefined,
            shirtProductId: needsShirt ? shirt?.productId : undefined,
            shirtVariantId: needsShirt ? shirt?.variantId : undefined,
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
        <Button className="w-full font-bold text-white opacity-50" style={{ backgroundColor: 'var(--brand-green)' }} disabled>
          Join {props.tierName}
        </Button>
      }
    >
      <JoinInner {...props} />
    </Suspense>
  )
}
