'use client'

import { CreditCard } from 'lucide-react'
import { MemberGate } from '@/components/member-gate'
import { StoreCardReload } from '@/components/member-portal/store-card-reload'

type Props = {
  amounts: number[]
  eyebrow?: string
  title?: string
  body?: string
}

export function StoreCardCta({
  amounts,
  eyebrow = 'Store Card',
  title = "Ready to load your student's card?",
  body = 'Most students spend $20–$40 per month. Load online, student taps their card at the window. Funds never expire.',
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

        <MemberGate label="Log in or create a free account to load a card">
          <div className="max-w-sm mx-auto">
            <StoreCardReload
              amounts={amounts}
              triggerLabel="Choose student & reload"
              triggerClassName="w-full justify-center !bg-[#FFD700] !text-[#1A1A1A] px-8 py-3"
            />
          </div>
        </MemberGate>

        <p className="text-white/30 text-xs mt-6">
          Secure checkout via Wix Payments. Funds applied to student account within minutes.
        </p>
      </div>
    </section>
  )
}
