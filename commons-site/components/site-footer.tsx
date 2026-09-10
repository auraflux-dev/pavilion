import Link from 'next/link'
import { PavilionMark } from '@/components/marketing/pavilion-mark'
import { LEGAL_ENTITY, PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/brand'
import { CONTACT_EMAIL, DEMO_URL, PLATFORM_STAFF_URL } from '@/lib/pricing'

const explore = [
  { href: '/product', label: 'Product' },
  { href: '/process', label: 'Process' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/help', label: 'Help' },
  { href: DEMO_URL, label: 'Riverside demo', external: true },
]

export function SiteFooter() {
  return (
    <footer className="bg-[var(--brand-dark)] text-[#f5f0e8]">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <PavilionMark className="h-9 w-9 shrink-0 text-[var(--brand-accent)]" />
            <span className="text-sm font-semibold uppercase tracking-wider text-white">
              {PRODUCT_NAME}
            </span>
          </Link>
          <div className="text-xs font-normal leading-relaxed text-[#c8dcc8]">{PRODUCT_TAGLINE}</div>
          <div className="text-xs font-medium text-[#9bb89b]">A product of {LEGAL_ENTITY}.</div>
        </div>

        <div className="space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#eef6ee]">Explore</div>
          {explore.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                className="block text-sm text-[#c8dcc8] transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="block text-sm text-[#c8dcc8] transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ),
          )}
        </div>

        <div className="space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#eef6ee]">Contact</div>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="block text-sm text-[#c8dcc8] transition-colors hover:text-white"
          >
            {CONTACT_EMAIL}
          </a>
          <a
            href={PLATFORM_STAFF_URL}
            className="block text-sm text-[#c8dcc8] transition-colors hover:text-white"
          >
            Platform Staff
          </a>
          <Link
            href="/account"
            className="block text-sm text-[#c8dcc8] transition-colors hover:text-white"
          >
            Account
          </Link>
        </div>

        <div className="space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#eef6ee]">Legal</div>
          <Link
            href="/privacy"
            className="block text-sm text-[#c8dcc8] transition-colors hover:text-white"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="block text-sm text-[#c8dcc8] transition-colors hover:text-white"
          >
            Terms of Service
          </Link>
          <Link
            href="/help"
            className="block text-sm text-[#c8dcc8] transition-colors hover:text-white"
          >
            Help center
          </Link>
        </div>
      </div>
    </footer>
  )
}
