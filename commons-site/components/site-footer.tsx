import Link from 'next/link'
import { PavilionMark } from '@/components/marketing/pavilion-mark'
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/brand'
import { CONTACT_EMAIL, DEMO_URL } from '@/lib/pricing'

const explore = [
  { href: '/', label: 'Home' },
  { href: '/product', label: 'Product' },
  { href: '/process', label: 'Process' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

const legal = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/help', label: 'Help' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-emerald-900 bg-emerald-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <PavilionMark className="h-9 w-9 shrink-0 text-emerald-300" />
              <span className="text-sm font-semibold uppercase tracking-wider text-white">
                {PRODUCT_NAME}
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm font-normal leading-relaxed text-emerald-100/80">
              {PRODUCT_TAGLINE}
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Explore
            </div>
            <ul className="mt-3 space-y-2">
              {explore.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-emerald-100/80 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Contact
            </div>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-sm text-emerald-100/80 transition-colors hover:text-white"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={DEMO_URL}
                  className="text-sm text-emerald-100/80 transition-colors hover:text-white"
                >
                  Demo
                </a>
              </li>
              <li>
                <Link
                  href="/account"
                  className="text-sm text-emerald-100/80 transition-colors hover:text-white"
                >
                  Account
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Legal
            </div>
            <ul className="mt-3 space-y-2">
              {legal.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-emerald-100/80 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs font-medium text-emerald-200/70">
          © Pavilion. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
