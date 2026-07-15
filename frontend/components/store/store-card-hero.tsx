'use client'

import { useState } from 'react'
import { CreditCard, CheckCircle2 } from 'lucide-react'
import { MemberGate } from '@/components/member-gate'
import { startWixCheckout } from '@/lib/start-checkout'

export type StoreCardDenomination = { amount: number; label: string; note: string }

type HowStep = { step: string; title: string; body: string }

type Props = {
  amounts: number[]
  eyebrow?: string
  title?: string
  perks?: string[]
  howItWorks?: HowStep[]
}

const DEFAULT_NOTES: Record<number, string> = {
  10: 'Starter',
  20: 'Popular',
  25: 'Best value',
}

function defaultDenominations(amounts: number[]): StoreCardDenomination[] {
  return amounts.map((amount) => ({
    amount,
    label: `$${amount}`,
    note: DEFAULT_NOTES[amount] || 'Load',
  }))
}

function parseHowSteps(bullets: string[]): HowStep[] {
  return bullets.map((line, i) => {
    const parts = line.split('|')
    if (parts.length >= 3) {
      return { step: parts[0], title: parts[1], body: parts.slice(2).join('|') }
    }
    return {
      step: String(i + 1),
      title: line,
      body: '',
    }
  })
}

export function StoreCardHero({
  amounts,
  eyebrow = 'SHMS Store Card',
  title = 'Load a card, your student handles the rest.',
  perks = ['No cash needed', 'Reload anytime online', 'Funds never expire'],
  howItWorks,
}: Props) {
  const [busy, setBusy] = useState<number | null>(null)
  const denominations = defaultDenominations(amounts)
  const steps =
    howItWorks ??
    parseHowSteps([
      '1|Parent loads the card|Choose an amount and pay securely online — card or Apple Pay.',
      '2|Student uses their card|The balance is on the physical store card your student carries.',
      '3|Tap & go at the window|Cashier taps the card at the PTO store reader — done.',
    ])

  async function handleLoad(amount: number) {
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
                <span className="text-xs font-bold tracking-widest uppercase text-white/70">
                  {eyebrow}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-3">
                {title}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {perks.map((p) => (
                  <span key={p} className="flex items-center gap-1.5 text-xs text-white/80">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-300 shrink-0" aria-hidden="true" />
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <MemberGate label="Log in or create a free account to load a card">
              <div className="flex flex-wrap gap-2 shrink-0">
                {denominations.map(({ amount, label, note }) => (
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
            {steps.map(({ step, title: stepTitle, body }) => (
              <div key={step} className="flex items-start gap-3 py-4 px-2 sm:px-6">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs mt-0.5"
                  style={{ backgroundColor: '#085508', color: 'white' }}
                >
                  {step}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1A1A1A]">{stepTitle}</p>
                  {body ? (
                    <p className="text-xs text-[#5A6070] leading-relaxed mt-0.5">{body}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
