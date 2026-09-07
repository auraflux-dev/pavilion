'use client'

import Link from 'next/link'
import { useState } from 'react'
import { PavilionMark } from '@/components/marketing/pavilion-mark'
import { PRODUCT_NAME } from '@/lib/brand'
import { DEMO_URL } from '@/lib/pricing'

const primaryNav = [
  { href: '/product', label: 'Product' },
  { href: '/process', label: 'Process' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
]

const moreNav = [
  { href: '/help', label: 'Help' },
  { href: '/account', label: 'Account' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="relative z-30 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[1.25rem] tracking-tight text-[var(--ink)] sm:text-[1.375rem]"
        >
          <PavilionMark className="h-5 w-5 text-[var(--accent)]" />
          {PRODUCT_NAME}
        </Link>

        <nav className="type-small hidden items-center gap-6 font-medium md:flex">
          {primaryNav.map((item) => (
            <Link key={item.href} href={item.href} className="text-[var(--ink)] hover:text-[var(--accent)]">
              {item.label}
            </Link>
          ))}
          <a href={DEMO_URL} className="btn-primary !px-3 !py-1.5">
            Try the demo
          </a>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <a href={DEMO_URL} className="btn-primary !px-3 !py-1.5 !text-[0.8125rem]">
            Demo
          </a>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] text-[var(--ink)]"
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

      {open ? (
        <div id="mobile-nav" className="border-t border-[var(--line)] bg-[var(--paper)] md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4 text-base font-medium">
            {[...primaryNav, ...moreNav].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2 py-3 text-[var(--ink)] hover:bg-[var(--paper-deep)]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <a
              href={DEMO_URL}
              className="mt-2 rounded-md bg-[var(--ink)] px-3 py-3 text-center text-[var(--paper)]"
              onClick={() => setOpen(false)}
            >
              Try the demo
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
