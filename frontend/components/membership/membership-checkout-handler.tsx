'use client'

/**
 * After login/signup return to /membership?checkout=ruby&studentId=…
 * auto-opens Wix checkout and offers a "I've completed payment" claim.
 */
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { startWixCheckout } from '@/lib/start-checkout'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'

function HandlerInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { status, refresh } = useAuth()
  const checkout = searchParams.get('checkout')
  const studentId = searchParams.get('studentId')
  const purchased = searchParams.get('purchased')
  const [claimStatus, setClaimStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [claimMsg, setClaimMsg] = useState('')

  useEffect(() => {
    if (status !== 'member') return
    if (!checkout || (checkout !== 'ruby' && checkout !== 'supreme')) return

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

      try {
        await startWixCheckout({
          kind: 'membership',
          tier: checkout,
          postFlowUrl: `${window.location.origin}/membership`,
        })
      } catch {
        // claim banner still shown after redirect
      }

      if (cancelled) return
      const next = new URLSearchParams(searchParams.toString())
      next.delete('checkout')
      next.set('purchased', '1')
      if (studentId) next.set('studentId', studentId)
      router.replace(`/membership?${next.toString()}`)
    })()

    return () => {
      cancelled = true
    }
  }, [status, checkout, studentId, router, searchParams])

  async function claimPurchase() {
    setClaimStatus('loading')
    setClaimMsg('')
    try {
      let pending: { tier?: string; studentId?: string | null } = {}
      try {
        pending = JSON.parse(sessionStorage.getItem('pendingMembership') || '{}')
      } catch {
        pending = {}
      }
      const tier = pending.tier || (checkout === 'supreme' ? 'supreme' : 'ruby')
      const res = await fetch('/api/membership/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          studentId: pending.studentId ?? studentId,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not confirm membership')
      try {
        sessionStorage.removeItem('pendingMembership')
      } catch {
        // ignore
      }
      setClaimStatus('ok')
      setClaimMsg(
        data.updatedStudentIds?.length
          ? 'Membership applied to your student. Opening your portal…'
          : 'Membership recorded. Add a student in the portal to finish setup.'
      )
      refresh()
      setTimeout(() => {
        window.location.href = '/member-portal'
      }, 1200)
    } catch (err) {
      setClaimStatus('error')
      setClaimMsg(err instanceof Error ? err.message : 'Claim failed')
    }
  }

  if (status !== 'member' || purchased !== '1') return null

  return (
    <div className="max-w-3xl mx-auto mb-8 rounded-2xl border border-[#E8E4DC] bg-white p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        <p className="font-bold text-[#1A1A1A] mb-1">Finished checkout?</p>
        <p className="text-sm text-[#5A6070]">
          After you pay on the Wix checkout page, confirm here so we link your paid membership
          (Ruby/Supreme) to your free parent account
          {studentId ? ' and selected student' : ''}.
        </p>
        {claimMsg && (
          <p
            className={`text-sm mt-2 ${claimStatus === 'error' ? 'text-red-600' : 'text-[#085508]'}`}
          >
            {claimMsg}
          </p>
        )}
      </div>
      <Button
        type="button"
        onClick={claimPurchase}
        disabled={claimStatus === 'loading' || claimStatus === 'ok'}
        className="font-semibold text-white shrink-0"
        style={{ backgroundColor: '#085508' }}
      >
        {claimStatus === 'loading' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : claimStatus === 'ok' ? (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" /> Done
          </>
        ) : (
          "I've completed payment"
        )}
      </Button>
    </div>
  )
}

export function MembershipCheckoutHandler() {
  return (
    <Suspense fallback={null}>
      <HandlerInner />
    </Suspense>
  )
}
