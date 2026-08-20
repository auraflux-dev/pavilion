import Link from 'next/link'
import { PRODUCT_NAME } from '@/lib/brand'
import { DEMO_URL } from '@/lib/pricing'

const nav = [
  { href: '/product', label: 'Product' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/watch', label: 'Watch' },
  { href: '/help', label: 'Help' },
  { href: '/partners', label: 'Partners' },
  { href: '/account', label: 'Account' },
  { href: '/start', label: 'Start' },
]

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)]"
        >
          {PRODUCT_NAME}
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-[var(--ink-muted)]">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-[var(--ink)]">
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
