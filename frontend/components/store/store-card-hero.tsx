'use client'

import Link from 'next/link'
import { CreditCard, CheckCircle2, ArrowLeft } from 'lucide-react'
import { MemberGate } from '@/components/member-gate'
import { StoreCardReload } from '@/components/member-portal/store-card-reload'
import { CoveLogo } from '@/components/brand/cove-logo'
import { formatStoreCardBonusExample } from '@/lib/store-card-bonus'
import { useAuth } from '@/lib/hooks/use-auth'
import { DEMO_BRAND } from '@/lib/demo/brand'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { isPublicDemoInstance } from '@/lib/demo/instance'

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
  title = 'Become a free member, then load a Cove Digital Card.',
  perks = [
    'Free parent membership required',
    'One family Cove Digital Card & balance',
    '10% on first load · up to $500',
  ],
  howItWorks,
  bonusPercent = 10,
  maxAmount = 500,
}: Props) {
  const { status } = useAuth()
  const isMember = status === 'member'
  const denominations = defaultDenominations(amounts)
  const demo = isPublicDemoInstance()

  const displayTitle = vanillaizeIfDemo(
    isMember ? 'Load your family Cove Digital Card.' : title,
  )
  const displayEyebrow = vanillaizeIfDemo(eyebrow)
  const displayPerks = isMember
    ? [
        'One family Cove Digital Card & balance',
        `${bonusPercent}% on first load (not reloads) · up to $${maxAmount}`,
        'Pay online · spend at the snack window with code or QR',
      ]
    : perks

  const visitorSteps =
    howItWorks ??
    parseHowSteps([
      '1|Become a free member|Create a free parent account, then choose an amount and pay online.',
      `2|First load gets ${bonusPercent}% extra|${formatStoreCardBonusExample(50, bonusPercent)}. Reloads are dollar-for-dollar.`,
      '3|Spend at The Cove|Students show the Cove Digital Card code or QR from the member portal.',
    ])
  const memberSteps = parseHowSteps([
    `1|Choose an amount|Load any whole dollar up to $${maxAmount}. ${formatStoreCardBonusExample(50, bonusPercent)} on your first load.`,
    '2|One family balance|Every student in your household shares the same Cove Digital Card balance.',
    '3|Spend at the window|Students use the portal QR or 6-digit code at The Cove snack window.',
  ])
  const steps = (isMember ? memberSteps : visitorSteps).map((s) => ({
    ...s,
    title: vanillaizeIfDemo(s.title),
    body: vanillaizeIfDemo(s.body),
  }))

  return (
    <>
      <section id="card" className="py-12 md:py-16 scroll-mt-28" style={{ backgroundColor: '#085508' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isMember ? (
            <div className="mb-6">
              <Link
                href="/member-portal#store"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white hover:underline"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Return to Member Portal
              </Link>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-2xl bg-[#F5F0E8] p-1.5 shadow-sm shrink-0">
                  {demo ? (
                    <span
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
                      style={{ backgroundColor: '#085508' }}
                      aria-hidden="true"
                    >
                      {DEMO_BRAND.store.replace(/^The\s+/i, '').charAt(0)}
                    </span>
                  ) : (
                    <CoveLogo size="md" priority className="w-20 h-20 sm:w-24 sm:h-24" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-4 h-4 text-yellow-300 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-bold tracking-widest uppercase text-white/70">
                      {displayEyebrow}
                    </span>
                  </div>
                  <p className="text-sm text-white/75 hidden sm:block max-w-xs leading-snug">
                    {vanillaizeIfDemo('Snacks · spirit wear · Cove Digital Card')}
                  </p>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-tight tracking-tight max-w-xl">
                {displayTitle}
              </h1>
              <ul className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-x-5 gap-y-2">
                {displayPerks.map((p) => vanillaizeIfDemo(p)).map((p) => (
                  <li key={p} className="flex items-center gap-1.5 text-sm text-white/85">
                    <CheckCircle2 className="w-4 h-4 text-green-300 shrink-0" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-white/65 max-w-lg">
                {formatStoreCardBonusExample(50, bonusPercent)} on first load or membership credit.
                Reloads are 1:1. Load any whole dollar up to ${maxAmount}. Pay with card or PayPal.
              </p>
            </div>

            <div className="lg:col-span-5">
              {/* Always show a solid card so the CTA stays visible on the green hero
                  (visitor MemberGate used to render green-on-green = invisible). */}
              <div className="w-full max-w-md lg:ml-auto rounded-2xl bg-white p-5 sm:p-6 shadow-lg border border-white/40">
                <p
                  className="text-xs font-bold tracking-widest uppercase mb-3"
                  style={{ color: '#085508' }}
                >
                  {vanillaizeIfDemo('Cove Digital Card')}
                </p>
                <p className="text-sm text-[#5A6070] mb-4 leading-snug">
                  {vanillaizeIfDemo(
                    'Free parent account required. Load online, spend at The Cove with code or QR.',
                  )}
                </p>
                <MemberGate
                  label={vanillaizeIfDemo('Load a Cove Digital Card')}
                  className="inline-flex items-center justify-center w-full font-bold text-sm px-5 py-3 rounded-lg bg-[#085508] text-white transition-opacity hover:opacity-90"
                >
                  <StoreCardReload
                    amounts={denominations.map(({ amount }) => amount)}
                    bonusPercent={bonusPercent}
                    maxAmount={maxAmount}
                    triggerLabel={vanillaizeIfDemo('Load Cove Digital Card')}
                    triggerClassName="w-full justify-center px-5 py-3 bg-[#085508] text-white"
                  />
                </MemberGate>
              </div>
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
