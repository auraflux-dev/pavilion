'use client'

/**
 * Dual-season offer. Fall is the primary registration path.
 * Spring is an optional add-on (same night / instructor).
 */
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

  // Catalog card on Fall: soft Spring teaser.
  // Catalog card on Spring: point parents back to Fall (primary).
  if (variant === 'card') {
    if (companionIsSpring) {
      return (
        <div className="mt-3 rounded-xl border border-[var(--brand-green)]/30 bg-[var(--brand-soft)] px-3 py-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-green)]">
            Optional Spring 2027
          </p>
          <p className="mt-1 text-sm text-[#1A1A1A] font-semibold leading-snug">{name}</p>
          <p className="mt-0.5 text-xs text-[#5A6070] whitespace-pre-line">
            {`Same night and instructor.
Add Spring when you register for Fall${feeLabel ? `\nSpring tuition ${feeLabel}` : ''}.`}
          </p>
          <Link
            href={href}
            className="mt-1.5 inline-block text-xs font-semibold text-[var(--brand-green)] hover:underline"
          >
            Spring details
          </Link>
        </div>
      )
    }
    return (
      <div className="mt-3 rounded-xl border border-[var(--brand-green)]/30 bg-[var(--brand-soft)] px-3 py-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-green)]">
          Start with Fall 2026
        </p>
        <p className="mt-1 text-sm text-[#1A1A1A] font-semibold leading-snug">{name}</p>
        <p className="mt-0.5 text-xs text-[#5A6070] whitespace-pre-line">
          {`Fall is the main semester.
Register Fall first, then add Spring at checkout${feeLabel ? `\nFall tuition ${feeLabel}` : ''}.`}
        </p>
        <Link
          href={href}
          className="mt-1.5 inline-block text-xs font-semibold text-[var(--brand-green)] hover:underline"
        >
          Fall details
        </Link>
      </div>
    )
  }

  // Checkout checkbox: only for adding Spring onto a Fall primary.
  if (variant === 'checkout' && selectable) {
    if (!companionIsSpring) {
      // On a Spring register form: do not treat Fall as a peer add-on.
      return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--brand-warm)] px-3 py-3">
          <p className="text-sm font-bold text-[#1A1A1A]">Fall is the main registration</p>
          <p className="text-xs text-[#5A6070] mt-1 whitespace-pre-line">
            {`Most families register Fall first.
You can add Spring on the Fall checkout.
${name}${feeLabel ? `\nFall tuition ${feeLabel}` : ''}`}
          </p>
          <Link
            href={href}
            className="mt-2 inline-block text-xs font-semibold text-[var(--brand-green)] hover:underline"
          >
            Go to Fall class
          </Link>
        </div>
      )
    }
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
            Also add Spring 2027{feeLabel ? ` · ${feeLabel}` : ''}
          </span>
          <span className="block text-xs text-[#5A6070] mt-0.5 whitespace-pre-line">
            {`${name}
Optional. Same night.
One checkout covers Fall and Spring.`}
          </span>
        </span>
      </label>
    )
  }

  // Landing sidebar
  if (companionIsSpring) {
    return (
      <aside className="rounded-2xl border border-[var(--brand-green)]/25 bg-white p-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-green)]">
          Optional Spring 2027
        </p>
        <p className="text-base font-bold text-[#1A1A1A] leading-snug">{name}</p>
        <p className="text-sm text-[#5A6070] whitespace-pre-line">
          {`This page is Fall registration.
Spring continues the same night and instructor.
Add Spring at checkout if you want both semesters${feeLabel ? `\nSpring tuition ${feeLabel}` : ''}.`}
        </p>
        <Link
          href={href}
          className="text-sm font-semibold text-[var(--brand-green)] hover:underline"
        >
          Preview Spring class
        </Link>
      </aside>
    )
  }

  return (
    <aside className="rounded-2xl border border-[var(--brand-green)]/25 bg-white p-4 space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-green)]">
        Fall 2026 is primary
      </p>
      <p className="text-base font-bold text-[#1A1A1A] leading-snug">{name}</p>
      <p className="text-sm text-[#5A6070] whitespace-pre-line">
        {`You are on the Spring page.
Most families register Fall first, then add Spring.
Start on Fall to check out both together${feeLabel ? `\nFall tuition ${feeLabel}` : ''}.`}
      </p>
      <Link
        href={href}
        className="text-sm font-semibold text-[var(--brand-green)] hover:underline"
      >
        Register Fall (recommended)
      </Link>
    </aside>
  )
}
