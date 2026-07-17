'use client'

import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MemberGate } from '@/components/member-gate'
import { startWixCheckout } from '@/lib/start-checkout'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

interface Props {
  tierId: string
  tierName: string
}

function JoinInner({ tierId, tierName }: Props) {
  const searchParams = useSearchParams()
  const studentId = searchParams.get('studentId')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startCheckout() {
    setBusy(true)
    setError(null)
    try {
      sessionStorage.setItem(
        'pendingMembership',
        JSON.stringify({
          tier: tierId,
          studentId: studentId ?? null,
          startedAt: Date.now(),
        })
      )
      await startWixCheckout({
        kind: 'membership',
        tier: tierId,
        postFlowUrl: `${window.location.origin}/membership`,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setBusy(false)
    }
  }

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
          disabled={busy}
          onClick={startCheckout}
        >
          {busy ? 'Opening checkout…' : `Join ${tierName}`}
          {!busy && (
            <ArrowRight
              className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          )}
        </Button>
        {error && <p className="text-xs text-red-600 text-center">{error}</p>}
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
