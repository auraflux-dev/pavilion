'use client'

import Link from 'next/link'
import { DemoBookingLink } from '@/components/demo-booking-link'
import { PavilionMark } from '@/components/marketing/pavilion-mark'
import { PRODUCT_NAME } from '@/lib/brand'

const primaryNav = [
  { href: '/', label: 'Home' },
  { href: '/product', label: 'Product' },
  { href: '/process', label: 'Process' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/60 bg-zinc-50/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-zinc-900"
        >
          <PavilionMark className="h-8 w-8 shrink-0 text-emerald-900" />
          <span className="tracking-tight">{PRODUCT_NAME}</span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <nav
            className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex lg:gap-7"
            aria-label="Primary"
          >
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <DemoBookingLink className="btn-primary !py-2.5 !text-xs">
            Book a Demo
          </DemoBookingLink>
        </div>
      </div>

      <nav
        className="flex gap-4 overflow-x-auto border-t border-zinc-200/60 px-4 py-2 text-sm font-medium text-slate-600 md:hidden"
        aria-label="Primary mobile"
      >
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap hover:text-slate-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
