'use client'

import Link from 'next/link'
import { DemoBookingLink } from '@/components/demo-booking-link'
import { PavilionMark } from '@/components/marketing/pavilion-mark'
import { PRODUCT_NAME } from '@/lib/brand'

/** Marketing nav paired with Business Rocket: Home + pages + Contact; Book a Demo CTA. */
const primaryNav = [
  { href: '/', label: 'Home' },
  { href: '/product', label: 'Product' },
  { href: '/process', label: 'Process' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

const ctaClass =
  'inline-flex rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-900'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--line)]/80 bg-[var(--brand-warm)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <PavilionMark className="h-9 w-9 shrink-0 text-[var(--brand-primary)] sm:h-10 sm:w-10" />
          <span className="font-sans text-xl font-bold tracking-tight text-[var(--brand-primary)] sm:text-2xl">
            {PRODUCT_NAME}
          </span>
          <span className="hidden rounded-full border border-[var(--line)] bg-[var(--brand-mist)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] sm:inline-block">
            PTO OS
          </span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <nav
            className="hidden items-center gap-5 text-sm font-medium text-[var(--ink-muted)] md:flex lg:gap-7"
            aria-label="Primary"
          >
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-[var(--brand-primary)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <DemoBookingLink className={ctaClass}>Book a Demo</DemoBookingLink>
        </div>
      </div>

      <nav
        className="flex gap-4 overflow-x-auto border-t border-[var(--line)]/80 px-4 py-2 text-sm font-medium text-[var(--ink-muted)] md:hidden"
        aria-label="Primary mobile"
      >
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap hover:text-[var(--brand-primary)]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
