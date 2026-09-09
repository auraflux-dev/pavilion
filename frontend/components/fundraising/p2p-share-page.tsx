'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MemberGate } from '@/components/member-gate'
import { Button } from '@/components/ui/button'
import { buyNowGoCheckout } from '@/lib/cart/buy-actions'
import {
  DONATION_MAX_DOLLARS,
  DONATION_MIN_DOLLARS,
  DONATION_PRESETS,
  isAllowedDonationAmount,
} from '@/lib/donation'

export type P2pPublicPage = {
  shareCode: string
  ownerName: string
  blurb: string
  raisedCents: number
  campaignTitle?: string
  campaignStory?: string
  campaignGoalCents?: number
}

export function P2pSharePage({ page }: { page: P2pPublicPage }) {
  const router = useRouter()
  const [amount, setAmount] = useState<number>(DONATION_PRESETS[1] ?? 15)
  const [other, setOther] = useState(false)
  const [custom, setCustom] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const effective = useMemo(() => {
    if (other) {
      const n = Number(custom)
      return Number.isFinite(n) ? n : 0
    }
    return amount
  }, [amount, other, custom])

  function donate() {
    setError('')
    if (!isAllowedDonationAmount(effective)) {
      setError(`Enter an amount between $${DONATION_MIN_DOLLARS} and $${DONATION_MAX_DOLLARS}.`)
      return
    }
    const tip = note.trim()
    buyNowGoCheckout(
      {
        kind: 'donation',
        title: `Gift for ${page.ownerName}`,
        amount: effective,
        href: `/p2p/${page.shareCode}`,
        amountCents: Math.round(effective * 100),
        note: tip || `Supporting ${page.ownerName}`,
        p2pShareCode: page.shareCode,
      },
      router,
    )
  }

  const raised = (page.raisedCents / 100).toFixed(page.raisedCents % 100 ? 2 : 0)
  const goal =
    page.campaignGoalCents && page.campaignGoalCents > 0
      ? (page.campaignGoalCents / 100).toFixed(0)
      : null

  return (
    <main className="min-h-screen bg-[var(--background,#f7f5f1)]">
      <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6070]">
            {page.campaignTitle || 'Fundraiser'}
          </p>
          <h1 className="text-3xl font-bold text-[#1A1A1A] mt-1">{page.ownerName}</h1>
          {page.blurb ? (
            <p className="text-base text-[#1A1A1A] whitespace-pre-line mt-3">{page.blurb}</p>
          ) : null}
          {page.campaignStory ? (
            <p className="text-sm text-[#5A6070] whitespace-pre-line mt-4">{page.campaignStory}</p>
          ) : null}
          <p className="text-sm font-semibold text-[#1A1A1A] mt-4">
            ${raised} raised
            {goal ? ` toward $${goal}` : ''}
          </p>
        </div>

        <MemberGate>
          <div className="rounded-xl border border-[var(--border)] bg-white p-4 space-y-3">
            <p className="text-sm font-bold text-[#1A1A1A]">Give on this page</p>
            <div className="flex flex-wrap gap-2">
              {DONATION_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setOther(false)
                    setAmount(p)
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold border ${
                    !other && amount === p
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                      : 'bg-white text-[#5A6070]'
                  }`}
                >
                  ${p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setOther(true)}
                className={`rounded-md px-3 py-2 text-sm font-semibold border ${
                  other ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white text-[#5A6070]'
                }`}
              >
                Other
              </button>
            </div>
            {other ? (
              <input
                type="number"
                min={DONATION_MIN_DOLLARS}
                max={DONATION_MAX_DOLLARS}
                step="1"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Amount ($)"
                className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
              />
            ) : null}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
            />
            {error ? <p className="text-xs text-red-700">{error}</p> : null}
            <Button type="button" className="w-full" onClick={donate}>
              Donate ${effective > 0 ? effective.toFixed(effective % 1 ? 2 : 0) : '—'}
            </Button>
            <p className="text-[11px] text-[#5A6070]">
              Log in with your family account to complete checkout.
            </p>
          </div>
        </MemberGate>
      </div>
    </main>
  )
}
