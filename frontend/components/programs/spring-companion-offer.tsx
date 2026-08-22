'use client'

import Link from 'next/link'
import { displayProgramName } from '@/lib/programs/display-name'
import { programPublicPath } from '@/lib/programs/public-path'
import { resolveProgramSeason } from '@/lib/programs/season'
import type { Program } from '@/lib/api/programs'

type Props = {
  companion: Program
  /** When true, show add-to-cart checkbox (register form). */
  selectable?: boolean
  selected?: boolean
  onSelectedChange?: (next: boolean) => void
  /** Compact strip for catalog cards. */
  variant?: 'card' | 'checkout' | 'landing'
}

export function SpringCompanionOffer({
  companion,
  selectable = false,
  selected = false,
  onSelectedChange,
  variant = 'landing',
}: Props) {
  const name = displayProgramName(companion.name)
  const fee = Number(companion.fee ?? 0)
  const feeLabel = fee > 0 ? `$${fee}` : ''
  const href = programPublicPath(companion)
  const companionIsSpring = resolveProgramSeason(companion) === 'spring-2027'
  const seasonLabel = companionIsSpring ? 'Spring 2027' : 'Fall 2026'
  const otherLabel = companionIsSpring ? 'Spring' : 'Fall'

  if (variant === 'card') {
    return (
      <div className="mt-3 rounded-xl border border-[var(--brand-green)]/30 bg-[var(--brand-soft)] px-3 py-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-green)]">
          {companionIsSpring ? 'Spring 2027 continues' : 'Also offered in Fall 2026'}
        </p>
        <p className="mt-1 text-sm text-[#1A1A1A] font-semibold leading-snug">{name}</p>
        <p className="mt-0.5 text-xs text-[#5A6070] whitespace-pre-line">
          {`Same night and instructor.
Add ${otherLabel} when you register${feeLabel ? ` · ${feeLabel}` : ''}.`}
        </p>
        <Link
          href={href}
          className="mt-1.5 inline-block text-xs font-semibold text-[var(--brand-green)] hover:underline"
        >
          {otherLabel} details
        </Link>
      </div>
    )
  }

  if (variant === 'checkout' && selectable) {
    return (
      <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--brand-warm)] px-3 py-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1"
          checked={selected}
          onChange={(e) => onSelectedChange?.(e.target.checked)}
        />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-[#1A1A1A]">
            Add {seasonLabel}{feeLabel ? ` · ${feeLabel}` : ''}
          </span>
          <span className="block text-xs text-[#5A6070] mt-0.5 whitespace-pre-line">
            {`${name}
Same night. One checkout for Fall and Spring.`}
          </span>
        </span>
      </label>
    )
  }

  return (
    <aside className="rounded-2xl border border-[var(--brand-green)]/25 bg-white p-4 space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-green)]">
        {seasonLabel}
      </p>
      <p className="text-base font-bold text-[#1A1A1A] leading-snug">{name}</p>
      <p className="text-sm text-[#5A6070] whitespace-pre-line">
        {companionIsSpring
          ? `This class continues in Spring.
Reserve both semesters in one checkout${feeLabel ? ` (Spring ${feeLabel})` : ''}.`
          : `Fall is open now.
Add Fall in checkout with Spring${feeLabel ? ` (Fall ${feeLabel})` : ''}.`}
      </p>
      <div className="flex flex-wrap gap-3 pt-1">
        <Link
          href={href}
          className="text-sm font-semibold text-[var(--brand-green)] hover:underline"
        >
          View {otherLabel} class
        </Link>
      </div>
    </aside>
  )
}
