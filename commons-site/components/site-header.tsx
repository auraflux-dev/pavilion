import Link from 'next/link'
import { PavilionMark } from '@/components/marketing/pavilion-mark'
import { PRODUCT_NAME } from '@/lib/brand'
import { DEMO_URL } from '@/lib/pricing'

const primaryNav = [
  { href: '/product', label: 'Product' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/start', label: 'Start' },
]

const secondaryNav = [
  { href: '/watch', label: 'Watch' },
  { href: '/help', label: 'Help' },
  { href: '/partners', label: 'Partners' },
  { href: '/account', label: 'Account' },
]

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)]"
        >
          <PavilionMark className="h-5 w-5 text-[var(--accent)]" />
          {PRODUCT_NAME}
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm font-medium">
          {primaryNav.map((item) => (
            <Link key={item.href} href={item.href} className="text-[var(--ink)] hover:text-[var(--accent)]">
              {item.label}
            </Link>
          ))}
          <span className="hidden h-4 w-px bg-[var(--line)] sm:inline-block" aria-hidden />
          {secondaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={DEMO_URL}
            className="rounded-md bg-[var(--ink)] px-3 py-1.5 text-[var(--paper)] hover:bg-[var(--accent)]"
          >
            Try the demo
          </a>
        </nav>
      </div>
    </header>
  )
}
