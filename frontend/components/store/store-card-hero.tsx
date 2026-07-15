'use client'

import { useState } from 'react'
import { CreditCard, CheckCircle2 } from 'lucide-react'
import { MemberGate } from '@/components/member-gate'
import { startWixCheckout } from '@/lib/start-checkout'

const DENOMINATIONS: { amount: 10 | 20 | 25; label: string; note: string }[] = [
  { amount: 10, label: '$10', note: 'Starter' },
  { amount: 20, label: '$20', note: 'Popular' },
  { amount: 25, label: '$25', note: 'Best value' },
]

const HOW_IT_WORKS = [
  { step: '1', title: 'Parent loads the card', body: 'Choose an amount and pay securely online — card or Apple Pay.' },
  { step: '2', title: 'Student uses their card', body: 'The balance is on the physical store card your student carries.' },
  { step: '3', title: 'Tap & go at the window', body: 'Cashier taps the card at the PTO store reader — done.' },
]

export function StoreCardHero() {
  const [busy, setBusy] = useState<number | null>(null)

  async function handleLoad(amount: 10 | 20 | 25) {
    setBusy(amount)
    try {
      await startWixCheckout({
        kind: 'store-card',
        amount,
        postFlowUrl: `${window.location.origin}/store`,
      })
    } catch {
      // ignore — button re-enables
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <section className="py-8 md:py-10" style={{ backgroundColor: '#085508' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-yellow-300 shrink-0" aria-hidden="true" />
                <span className="text-xs font-bold tracking-widest uppercase text-white/70">SHMS Store Card</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-3">
                Load a card, your student handles the rest.
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {['No cash needed', 'Reload anytime online', 'Funds never expire'].map((p) => (
                  <span key={p} className="flex items-center gap-1.5 text-xs text-white/80">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-300 shrink-0" aria-hidden="true" />
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <MemberGate label="Log in or create a free account to load a card">
              <div className="flex flex-wrap gap-2 shrink-0">
                {DENOMINATIONS.map(({ amount, label, note }) => (
                  <button
                    key={amount}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => handleLoad(amount)}
                    className="flex flex-col items-center px-5 py-3 rounded-xl border-2 border-white/30 hover:border-white bg-white/10 hover:bg-white/20 transition-all group disabled:opacity-60"
                  >
                    <span className="text-xl font-bold text-white">
                      {busy === amount ? '…' : label}
                    </span>
                    <span className="text-[10px] text-white/60 group-hover:text-white/80">{note}</span>
                  </button>
                ))}
              </div>
            </MemberGate>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E8E4DC]" style={{ backgroundColor: '#F0F7F0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#D4E8D4]">
            {HOW_IT_WORKS.map(({ step, title, body }) => (
              <div key={step} className="flex items-start gap-3 py-4 px-2 sm:px-6">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs mt-0.5"
                  style={{ backgroundColor: '#085508', color: 'white' }}
                >
                  {step}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1A1A1A]">{title}</p>
                  <p className="text-xs text-[#5A6070] leading-relaxed mt-0.5">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
