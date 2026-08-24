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
import { useProgramUiCopy, ui } from '@/components/programs/program-ui-copy-context'

type Props = {
  companion: Program
  /** When true, show add-to-cart checkbox (register form). */
  selectable?: boolean
  selected?: boolean
  onSelectedChange?: (next: boolean) => void
  /** Compact strip for catalog cards. */
  variant?: 'card' | 'checkout' | 'landing'
}

function companionFeeLabel(companion: Program): string {
  const fee = Number(companion.fee ?? 0)
  const feeTbd = String(companion.tags ?? '')
    .split(/[,;\n]+/)
    .map((t) => t.trim().toLowerCase())
    .includes('fee-tbd')
  if (feeTbd) return 'Tuition TBD'
  if (fee > 0) return `$${fee}`
  return ''
}

function feeLine(copy: Record<string, string>, key: string, fee: string): string {
  if (!fee) return ''
  return ui(copy, key, { fee })
}

export function SpringCompanionOffer({
  companion,
  selectable = false,
  selected = false,
  onSelectedChange,
  variant = 'landing',
}: Props) {
  const copy = useProgramUiCopy()
  const name = displayProgramName(companion.name)
  const fee = companionFeeLabel(companion)
  const href = programPublicPath(companion)
  const companionIsSpring = resolveProgramSeason(companion) === 'spring-2027'

  if (variant === 'card') {
    if (companionIsSpring) {
      return (
        <div className="mt-3 rounded-xl border border-[var(--brand-green)]/30 bg-[var(--brand-soft)] px-3 py-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-green)]">
            {ui(copy, 'companion.spring.card.eyebrow')}
          </p>
          <p className="mt-1 text-sm text-[#1A1A1A] font-semibold leading-snug">{name}</p>
          <p className="mt-0.5 text-xs text-[#5A6070] whitespace-pre-line">
            {ui(copy, 'companion.spring.card.body', {
              feeLine: feeLine(copy, 'companion.spring.card.feeLine', fee),
            })}
          </p>
          <Link
            href={href}
            className="mt-1.5 inline-block text-xs font-semibold text-[var(--brand-green)] hover:underline"
          >
            {ui(copy, 'companion.spring.card.link')}
          </Link>
        </div>
      )
    }
    return (
      <div className="mt-3 rounded-xl border border-[var(--brand-green)]/30 bg-[var(--brand-soft)] px-3 py-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-green)]">
          {ui(copy, 'companion.fall.card.eyebrow')}
        </p>
        <p className="mt-1 text-sm text-[#1A1A1A] font-semibold leading-snug">{name}</p>
        <p className="mt-0.5 text-xs text-[#5A6070] whitespace-pre-line">
          {ui(copy, 'companion.fall.card.body', {
            feeLine: feeLine(copy, 'companion.fall.card.feeLine', fee),
          })}
        </p>
        <Link
          href={href}
          className="mt-1.5 inline-block text-xs font-semibold text-[var(--brand-green)] hover:underline"
        >
          {ui(copy, 'companion.fall.card.link')}
        </Link>
      </div>
    )
  }

  if (variant === 'checkout' && selectable) {
    if (!companionIsSpring) {
      return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--brand-warm)] px-3 py-3">
          <p className="text-sm font-bold text-[#1A1A1A]">{ui(copy, 'companion.checkout.fallTitle')}</p>
          <p className="text-xs text-[#5A6070] mt-1 whitespace-pre-line">
            {ui(copy, 'companion.checkout.fallBody', {
              name,
              feeLine: feeLine(copy, 'companion.checkout.fallFeeLine', fee),
            })}
          </p>
          <Link
            href={href}
            className="mt-2 inline-block text-xs font-semibold text-[var(--brand-green)] hover:underline"
          >
            {ui(copy, 'companion.checkout.fallLink')}
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
            {ui(copy, 'companion.checkout.springLabel', {
              feeSuffix: fee ? ui(copy, 'companion.checkout.springFeeSuffix', { fee }) : '',
            })}
          </span>
          <span className="block text-xs text-[#5A6070] mt-0.5 whitespace-pre-line">
            {ui(copy, 'companion.checkout.springBody', { name })}
          </span>
        </span>
      </label>
    )
  }

  if (companionIsSpring) {
    return (
      <aside className="rounded-2xl border border-[var(--brand-green)]/25 bg-white p-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-green)]">
          {ui(copy, 'companion.spring.landing.eyebrow')}
        </p>
        <p className="text-base font-bold text-[#1A1A1A] leading-snug">{name}</p>
        <p className="text-sm text-[#5A6070] whitespace-pre-line">
          {ui(copy, 'companion.spring.landing.body', {
            feeLine: feeLine(copy, 'companion.spring.landing.feeLine', fee),
          })}
        </p>
        <Link
          href={href}
          className="text-sm font-semibold text-[var(--brand-green)] hover:underline"
        >
          {ui(copy, 'companion.spring.landing.link')}
        </Link>
      </aside>
    )
  }

  return (
    <aside className="rounded-2xl border border-[var(--brand-green)]/25 bg-white p-4 space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-green)]">
        {ui(copy, 'companion.fall.landing.eyebrow')}
      </p>
      <p className="text-base font-bold text-[#1A1A1A] leading-snug">{name}</p>
      <p className="text-sm text-[#5A6070] whitespace-pre-line">
        {ui(copy, 'companion.fall.landing.body', {
          feeLine: feeLine(copy, 'companion.fall.landing.feeLine', fee),
        })}
      </p>
      <Link
        href={href}
        className="text-sm font-semibold text-[var(--brand-green)] hover:underline"
      >
        {ui(copy, 'companion.fall.landing.link')}
      </Link>
    </aside>
  )
}
