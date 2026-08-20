import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export type SectionJumpItem = {
  href: string
  label: string
  hint: string
  icon: LucideIcon
}

type Props = {
  eyebrow: string
  ariaLabel: string
  items: readonly SectionJumpItem[]
  /**
   * Optional body under the eyebrow.
   * Empty / whitespace-only copy hides the whole jump panel (no empty chrome).
   */
  copy?: string
  /**
   * `band`. full-bleed bar under a page hero (Cove).
   * `card`. inset card above dense content (member portal).
   */
  variant?: 'band' | 'card'
  className?: string
}

/**
 * Canonical in-page jump nav for long pages.
 * Prefer this over stacking more above-the-fold content: one section per job,
 * stable `#ids` with `scroll-mt-28`, and a jump row so nothing is missed on scroll.
 */
export function SectionJumpNav({
  eyebrow,
  ariaLabel,
  items,
  copy,
  variant = 'card',
  className = '',
}: Props) {
  // No empty top panel: if copy is provided but blank, omit the nav entirely.
  if (copy !== undefined && !copy.trim()) return null

  const cols =
    items.length <= 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : items.length === 4
        ? 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'

  const list = (
    <>
      <p className="text-[10px] font-bold tracking-widest uppercase text-[#5A6070] mb-2 text-center sm:text-left">
        {eyebrow}
      </p>
      {copy?.trim() ? (
        <p className="mb-3 text-sm leading-relaxed text-[#5A6070] whitespace-pre-line text-center sm:text-left">
          {copy.trim()}
        </p>
      ) : null}
      <ul className={`grid ${cols} gap-2 justify-items-stretch max-w-lg sm:max-w-none mx-auto sm:mx-0`}>
        {items.map(({ href, label, hint, icon: Icon }) => (
          <li key={href} className="w-full">
            <Link
              href={href}
              className={`flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 hover:border-[var(--brand-green)] hover:bg-[var(--brand-soft)] transition-colors h-full ${
                variant === 'band' ? 'bg-white' : 'bg-[#FAFCF9]'
              }`}
            >
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--brand-soft)' }}
              >
                <Icon className="w-4 h-4" style={{ color: 'var(--brand-green)' }} aria-hidden="true" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-bold text-[#1A1A1A] leading-snug">
                  {label}
                </span>
                <span className="block text-xs text-[#5A6070]">{hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )

  if (variant === 'band') {
    return (
      <nav
        className={`border-b border-[var(--border)] ${className}`}
        style={{ backgroundColor: '#FAFCF9' }}
        aria-label={ariaLabel}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">{list}</div>
      </nav>
    )
  }

  return (
    <nav
      className={`rounded-2xl border border-[var(--border)] bg-white px-4 py-3 sm:px-5 shadow-sm ${className}`}
      aria-label={ariaLabel}
    >
      {list}
    </nav>
  )
}
