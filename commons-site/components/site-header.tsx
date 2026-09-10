'use client'

import Link from 'next/link'
import { useState } from 'react'
import { DemoBookingLink } from '@/components/demo-booking-link'
import { PavilionMark } from '@/components/marketing/pavilion-mark'
import { PRODUCT_NAME } from '@/lib/brand'
import { DEMO_URL, PLATFORM_STAFF_URL } from '@/lib/pricing'

const primaryNav = [
  { href: '/product', label: 'Product' },
  { href: '/process', label: 'Process' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
]

const moreNav = [
  { href: '/help', label: 'Help' },
  { href: '/contact', label: 'Contact' },
  { href: '/account', label: 'Account' },
  { href: PLATFORM_STAFF_URL, label: 'Platform Staff', external: true as const },
]

const ctaClass =
  'rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium tracking-wide text-white shadow-sm transition-all hover:bg-[var(--brand-dark)]'

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--line)]/80 bg-[var(--brand-warm)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <PavilionMark className="h-9 w-9 shrink-0 text-[var(--brand-primary)] sm:h-10 sm:w-10" />
          <span className="font-sans text-xl font-bold tracking-tight text-[var(--brand-primary)] sm:text-2xl">
            {PRODUCT_NAME}
          </span>
          <span className="hidden rounded-full border border-[var(--line)] bg-[var(--brand-mist)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] lg:inline-block">
            PTO OS
          </span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <nav
            className="hidden items-center gap-5 text-sm font-medium text-[var(--ink-muted)] md:flex lg:gap-8"
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
            <a
              href={DEMO_URL}
              className="transition-colors hover:text-[var(--brand-primary)]"
            >
              Demo
            </a>
          </nav>

          <DemoBookingLink className={`hidden sm:inline-flex ${ctaClass}`}>
            Book a Demo
          </DemoBookingLink>

          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--brand-text)] md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <nav
        className="flex gap-4 overflow-x-auto border-t border-[var(--line)]/80 px-4 py-2 text-sm font-medium text-[var(--ink-muted)] md:hidden"
        aria-label="Primary mobile"
      >
        {primaryNav.map((item) => (
          <Link key={item.href} href={item.href} className="whitespace-nowrap hover:text-[var(--brand-primary)]">
            {item.label}
          </Link>
        ))}
        <a href={DEMO_URL} className="whitespace-nowrap hover:text-[var(--brand-primary)]">
          Demo
        </a>
        <DemoBookingLink className="whitespace-nowrap font-semibold text-[var(--brand-primary)]">
          Book
        </DemoBookingLink>
      </nav>

      {open ? (
        <div id="mobile-nav" className="border-t border-[var(--line)] bg-white md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-sm font-medium">
            {[...primaryNav, ...moreNav].map((item) =>
              'external' in item && item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-2 py-3 text-[var(--ink-muted)] hover:bg-[var(--brand-mist)]"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-2 py-3 text-[var(--brand-text)] hover:bg-[var(--brand-mist)]"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ),
            )}
            <a
              href={DEMO_URL}
              className="rounded-lg px-2 py-3 text-[var(--brand-text)] hover:bg-[var(--brand-mist)]"
              onClick={() => setOpen(false)}
            >
              Try the Riverside demo
            </a>
            <DemoBookingLink
              className={`mt-2 inline-flex justify-center ${ctaClass} !px-3 !py-3`}
              onClick={() => setOpen(false)}
            >
              Book a Demo
            </DemoBookingLink>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
