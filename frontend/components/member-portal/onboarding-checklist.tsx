'use client'

import { CheckCircle2, Circle, Lock, ListChecks } from 'lucide-react'
import type { ChecklistItem } from '@/lib/onboarding-checklist'

type Props = {
  items: ChecklistItem[]
  requiredDone: number
  requiredTotal: number
  complete: boolean
  coveUnlocked: boolean
  highlight?: boolean
  onJumpStudents?: () => void
}

export function OnboardingChecklist({
  items,
  requiredDone,
  requiredTotal,
  complete,
  coveUnlocked,
  highlight = false,
  onJumpStudents,
}: Props) {
  if (complete && coveUnlocked) {
    return (
      <div
        id="portal-onboarding"
        className="rounded-xl border border-[#D4E8D4] bg-[#FAFCF9] px-4 py-3 mb-6 flex items-start gap-3"
      >
        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#085508' }} />
        <div>
          <p className="text-sm font-bold text-[#1A1A1A]">You&apos;re set up</p>
          <p className="text-xs text-[#5A6070] mt-0.5 leading-relaxed">
            Student profiles are complete. Cove Digital Card and programs are unlocked.
          </p>
        </div>
      </div>
    )
  }

  return (
    <section
      id="portal-onboarding"
      className={`rounded-xl border px-4 py-4 mb-6 ${
        highlight
          ? 'border-[#F0D9A0] bg-[#FFF7E6]'
          : 'border-[#E8E4DC] bg-white'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <ListChecks
          className="w-5 h-5 shrink-0 mt-0.5"
          style={{ color: highlight ? '#8A6400' : '#085508' }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#1A1A1A]">
            Family setup checklist
            <span className="font-semibold text-[#5A6070]">
              {' '}
              · {requiredDone}/{requiredTotal} required
            </span>
          </p>
          <p className="text-xs text-[#5A6070] mt-0.5 leading-relaxed">
            You can browse anytime. Cove QR, card loads, and enrichment stay locked until the
            required steps below are done.
          </p>
          {!coveUnlocked ? (
            <p className="text-xs font-semibold mt-2 inline-flex items-center gap-1.5 text-[#8A6400]">
              <Lock className="w-3.5 h-3.5" />
              The Cove Digital Card is locked until setup is complete
            </p>
          ) : null}
        </div>
      </div>

      <ul className="space-y-2.5">
        {items.map((item) => {
          const Icon = item.done ? CheckCircle2 : Circle
          return (
            <li
              key={item.id}
              className="flex items-start gap-2.5 rounded-lg border border-[#F0EDE8] bg-[#FAFAF8] px-3 py-2.5"
            >
              <Icon
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: item.done ? '#085508' : '#8A8F9C' }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {item.title}
                  {!item.required ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#5A6070] ml-2">
                      Optional
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-[#5A6070] mt-0.5 leading-relaxed">{item.detail}</p>
                {!item.done && item.actionLabel ? (
                  item.href?.startsWith('#') ? (
                    <button
                      type="button"
                      onClick={() => {
                        onJumpStudents?.()
                        const el = document.querySelector(item.href!)
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className="text-xs font-bold mt-1.5"
                      style={{ color: '#085508' }}
                    >
                      {item.actionLabel} →
                    </button>
                  ) : item.href ? (
                    <a
                      href={item.href}
                      className="inline-block text-xs font-bold mt-1.5"
                      style={{ color: '#085508' }}
                    >
                      {item.actionLabel} →
                    </a>
                  ) : null
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Compact lock notice for Cove / store actions when checklist incomplete. */
export function CoveFeatureLockBanner({ reason }: { reason: string }) {
  return (
    <div className="rounded-xl border border-[#F0D9A0] bg-[#FFF7E6] px-3 py-3 mb-4">
      <p className="text-xs font-bold text-[#8A6400] inline-flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5" />
        Cove features locked
      </p>
      <p className="text-xs text-[#8A6400] mt-1 leading-relaxed">{reason}</p>
      <a
        href="#portal-onboarding"
        className="inline-block text-xs font-bold mt-2"
        style={{ color: '#085508' }}
      >
        Open setup checklist →
      </a>
    </div>
  )
}
