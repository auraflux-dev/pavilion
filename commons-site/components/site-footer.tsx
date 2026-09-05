import Link from 'next/link'
import { PavilionMark } from '@/components/marketing/pavilion-mark'
import { LEGAL_ENTITY, PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/brand'
import { CLOSE_SLOGAN } from '@/lib/marketing'
import { CONTACT_EMAIL, DEMO_URL } from '@/lib/pricing'

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--paper-deep)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:flex-row sm:justify-between">
        <div className="max-w-sm space-y-3 text-sm text-[var(--ink-muted)]">
          <p className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
            <PavilionMark className="h-4 w-4 text-[var(--accent)]" />
            {PRODUCT_NAME}
          </p>
          <p className="whitespace-pre-line">{`${PRODUCT_TAGLINE}\nA product of ${LEGAL_ENTITY}.`}</p>
          <p className="whitespace-pre-line text-[var(--ink)]">{CLOSE_SLOGAN}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
          <Link href="/product" className="text-[var(--ink)] hover:underline">
            Product
          </Link>
          <Link href="/pricing" className="text-[var(--ink)] hover:underline">
            Pricing
          </Link>
          <Link href="/gallery" className="text-[var(--ink)] hover:underline">
            Gallery
          </Link>
          <Link href="/watch" className="text-[var(--ink)] hover:underline">
            Watch
          </Link>
          <Link href="/help" className="text-[var(--ink)] hover:underline">
            Help
          </Link>
          <Link href="/partners" className="text-[var(--ink)] hover:underline">
            Partners
          </Link>
          <Link href="/account" className="text-[var(--ink)] hover:underline">
            Account
          </Link>
          <Link href="/start" className="text-[var(--ink)] hover:underline">
            Start
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
