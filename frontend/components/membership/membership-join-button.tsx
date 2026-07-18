'use client'

import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MemberGate } from '@/components/member-gate'
import { PortalCardCheckout } from '@/components/checkout/portal-card-checkout'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

interface Props {
  tierId: string
  tierName: string
  price: number
}

function JoinInner({ tierId, tierName, price }: Props) {
  const searchParams = useSearchParams()
  const studentId = searchParams.get('studentId')
  const [open, setOpen] = useState(false)

  return (
    <MemberGate
      label={`Log in or create a free account to join ${tierName}`}
      returnToQuery={`checkout=${tierId}${studentId ? `&studentId=${studentId}` : ''}`}
    >
      <div className="space-y-2">
        <Button
          className="w-full font-bold text-white group"
          style={{ backgroundColor: '#085508' }}
          id={`join-${tierId}`}
          type="button"
          onClick={() => setOpen(true)}
        >
          Join {tierName} · ${price.toFixed(0)}
          <ArrowRight
            className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Button>
        <PortalCardCheckout
          open={open}
          onClose={() => setOpen(false)}
          amount={price}
          title={`Join ${tierName}`}
          subtitle="Pay with your own card on this page — free parent accounts can upgrade here"
          payBody={{ kind: 'membership', tier: tierId, studentId }}
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
