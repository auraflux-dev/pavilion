'use client'

import { CreditCard, CheckCircle2 } from 'lucide-react'
import { MemberGate } from '@/components/member-gate'
import { StoreCardReload } from '@/components/member-portal/store-card-reload'
import { formatStoreCardBonusExample } from '@/lib/store-card-bonus'

export type StoreCardDenomination = { amount: number; label: string; note: string }

type HowStep = { step: string; title: string; body: string }

type Props = {
  amounts: number[]
  eyebrow?: string
  title?: string
  perks?: string[]
  howItWorks?: HowStep[]
  bonusPercent?: number
  maxAmount?: number
}

const DEFAULT_NOTES: Record<number, string> = {
  10: 'Starter',
  20: 'Popular',
  25: 'Best value',
  50: 'Popular',
  100: 'Family',
  200: 'Bulk',
  500: 'Max',
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
  eyebrow = 'The Cove',
  title = 'Become a free member, then load a Cove card.',
  perks = [
    'Free parent membership required',
    'One family Cove card & balance',
    '10% on first load · up to $500',
  ],
  howItWorks,
  bonusPercent = 10,
  maxAmount = 500,
}: Props) {
  const denominations = defaultDenominations(amounts)
  const steps =
    howItWorks ??
    parseHowSteps([
      '1|Become a free member|Create a free parent account — then choose an amount and pay online.',
      `2|First load gets ${bonusPercent}% extra|${formatStoreCardBonusExample(50, bonusPercent)}. Reloads are dollar-for-dollar.`,
      '3|Tap at The Cove|One physical family card from PTO — same Square balance for every student in the household.',
    ])

  return (
    <>
      <section className="py-12 md:py-16" style={{ backgroundColor: '#085508' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-yellow-300 shrink-0" aria-hidden="true" />
                <span className="text-xs font-bold tracking-widest uppercase text-white/70">
                  {eyebrow}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-tight tracking-tight max-w-xl">
                {title}
              </h1>
              <ul className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-x-5 gap-y-2">
                {perks.map((p) => (
                  <li key={p} className="flex items-center gap-1.5 text-sm text-white/85">
                    <CheckCircle2 className="w-4 h-4 text-green-300 shrink-0" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-white/65 max-w-lg">
                {formatStoreCardBonusExample(50, bonusPercent)} on first load or membership credit —
                reloads are 1:1. Load any whole dollar up to ${maxAmount}. Pay with card or PayPal.
              </p>
            </div>

            <div className="lg:col-span-5">
              <MemberGate label="Become a free member to load a card">
                <div className="w-full max-w-md lg:ml-auto rounded-2xl bg-white/10 border border-white/15 p-4 sm:p-5 backdrop-blur-sm">
                  <p className="text-xs font-bold tracking-widest uppercase text-white/70 mb-3">
                    Load a Cove card
                  </p>
                  <StoreCardReload
                    amounts={denominations.map(({ amount }) => amount)}
                    bonusPercent={bonusPercent}
                    maxAmount={maxAmount}
                    triggerLabel="Choose student & load card"
                    triggerClassName="w-full justify-center !bg-white !text-[#085508] px-5 py-3"
                  />
                </div>
              </MemberGate>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E8E4DC]" style={{ backgroundColor: '#F0F7F0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#D4E8D4]">
            {steps.map(({ step, title: stepTitle, body }) => (
              <div key={step} className="flex items-start gap-3 py-5 px-2 sm:px-6">
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
