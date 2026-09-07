import Link from 'next/link'
import { PavilionMark } from '@/components/marketing/pavilion-mark'
import { LEGAL_ENTITY, PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/brand'
import { CONTACT_EMAIL, DEMO_URL } from '@/lib/pricing'

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--paper-deep)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:flex-row sm:justify-between">
        <div className="type-small max-w-sm space-y-3 text-[var(--ink-muted)]">
          <p className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[1.125rem] text-[var(--ink)]">
            <PavilionMark className="h-4 w-4 text-[var(--accent)]" />
            {PRODUCT_NAME}
          </p>
          <p className="whitespace-pre-line">{`${PRODUCT_TAGLINE}\nA product of ${LEGAL_ENTITY}.`}</p>
        </div>
        <div className="type-small grid grid-cols-2 gap-x-10 gap-y-2">
          <Link href="/product" className="text-[var(--ink)] hover:underline">
            Product
          </Link>
          <Link href="/process" className="text-[var(--ink)] hover:underline">
            Process
          </Link>
          <Link href="/pricing" className="text-[var(--ink)] hover:underline">
            Pricing
          </Link>
          <Link href="/about" className="text-[var(--ink)] hover:underline">
            About
          </Link>
          <Link href="/help" className="text-[var(--ink)] hover:underline">
            Help
          </Link>
          <Link href="/account" className="text-[var(--ink)] hover:underline">
            Account
          </Link>
          <a href={DEMO_URL} className="text-[var(--ink)] hover:underline">
            Riverside demo
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--ink)] hover:underline">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  )
}
