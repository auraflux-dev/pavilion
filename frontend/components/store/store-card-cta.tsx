'use client'

import { CreditCard } from 'lucide-react'
import { MemberGate } from '@/components/member-gate'
import { StoreCardReload } from '@/components/member-portal/store-card-reload'

type Props = {
  amounts: number[]
  eyebrow?: string
  title?: string
  body?: string
  bonusPercent?: number
  maxAmount?: number
}

export function StoreCardCta({
  amounts,
  eyebrow = 'Cove Card · Members',
  title = 'Free member? First load gets 10% extra.',
  body = 'One family Cove card and balance (up to $500 per load). 10% on first load or membership credit. Reloads are 1:1. Pick up one plastic card from PTO for the snack window.',
  bonusPercent = 10,
  maxAmount = 500,
}: Props) {
  return (
    <section className="py-14 md:py-20" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div
          className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-6"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFD700' }}
        >
          <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
          {eyebrow}
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{title}</h2>
        <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">{body}</p>

        <MemberGate label="Load a Cove card">
          <div className="max-w-sm mx-auto">
            <StoreCardReload
              amounts={amounts}
              bonusPercent={bonusPercent}
              maxAmount={maxAmount}
              triggerLabel="Load family card"
              triggerClassName="w-full justify-center !bg-[#FFD700] !text-[#1A1A1A] px-8 py-3"
            />
          </div>
        </MemberGate>

        <p className="text-white/30 text-xs mt-6">
          {bonusPercent}% on first load / membership credit only. Reloads 1:1 up to ${maxAmount}.
          Spending at the snack window is in person during Cove hours.
        </p>
      </div>
    </section>
  )
}
