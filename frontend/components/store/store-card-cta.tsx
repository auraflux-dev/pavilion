'use client'

import { CreditCard } from 'lucide-react'
import { MemberGate } from '@/components/member-gate'
import { StoreCardReload } from '@/components/member-portal/store-card-reload'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

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
  eyebrow = 'Cove Digital Card · Members',
  title = 'Free member? First load gets 10% extra.',
  body = 'One family Cove Digital Card and balance (up to $500 per load). 10% on first load or membership credit. Reloads are 1:1. Students spend with the code or QR at The Cove window.',
  bonusPercent = 10,
  maxAmount = 500,
}: Props) {
  eyebrow = vanillaizeIfDemo(eyebrow)
  title = vanillaizeIfDemo(title)
  body = vanillaizeIfDemo(body)
  return (
    <section className="py-14 md:py-20" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div
          className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-6"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--brand-gold)' }}
        >
          <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
          {eyebrow}
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{title}</h2>
        <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">{body}</p>

        <MemberGate
          label={vanillaizeIfDemo('Load a Cove Digital Card')}
          className="inline-flex items-center justify-center w-full max-w-sm mx-auto font-bold text-sm px-5 py-3 rounded-lg bg-white text-[var(--brand-green)] transition-opacity hover:opacity-90"
        >
          <div className="max-w-sm mx-auto">
            <StoreCardReload
              amounts={amounts}
              bonusPercent={bonusPercent}
              maxAmount={maxAmount}
              triggerLabel={vanillaizeIfDemo('Load Cove Digital Card')}
              triggerClassName="w-full justify-center !bg-[var(--brand-gold)] !text-[#1A1A1A] px-8 py-3"
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
