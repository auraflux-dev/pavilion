'use client'

import type { ReactNode } from 'react'

type Props = {
  step: number
  title: string
  description?: string
  children: ReactNode
  id?: string
  defaultOpen?: boolean
}

/**
 * Numbered step shell for the newsletter composer (top-to-bottom workflow).
 */
export function StaffNewsletterStep({
  step,
  title,
  description,
  children,
  id,
  defaultOpen = true,
}: Props) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className="group rounded-xl border border-[var(--border)] bg-white scroll-mt-28"
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: 'var(--brand-green)' }}
          aria-hidden
        >
          {step}
        </span>
        <span className="min-w-0 flex-1 pt-0.5">
          <span className="block text-sm font-semibold text-[#1B2A4A]">{title}</span>
          {description ? (
            <span className="mt-0.5 block text-xs text-[#5A6070] leading-relaxed">{description}</span>
          ) : null}
        </span>
        <span className="text-xs text-[#5A6070] group-open:hidden pt-1">Show</span>
        <span className="text-xs text-[#5A6070] hidden group-open:inline pt-1">Hide</span>
      </summary>
      <div className="space-y-4 border-t border-[var(--border)] px-4 py-4 sm:px-5">{children}</div>
    </details>
  )
}
