import Link from 'next/link'
import { LEGAL_ENTITY, PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/brand'
import { CONTACT_EMAIL, DEMO_URL } from '@/lib/pricing'

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--paper-deep)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10 sm:flex-row sm:justify-between">
        <div className="space-y-2 whitespace-pre-line text-sm text-[var(--ink-muted)]">
          <p className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
            {PRODUCT_NAME}
          </p>
          <p>{`${PRODUCT_TAGLINE}\nA product of ${LEGAL_ENTITY}.`}</p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/pricing" className="text-[var(--ink)] hover:underline">
            Pricing
          </Link>
          <Link href="/account" className="text-[var(--ink)] hover:underline">
            Account
          </Link>
          <Link href="/gallery" className="text-[var(--ink)] hover:underline">
            Gallery
          </Link>
          <Link href="/help" className="text-[var(--ink)] hover:underline">
            Help
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
