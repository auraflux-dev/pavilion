import Link from 'next/link'
import { CLOSE_SLOGAN, CLOSE_SUPPORT } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'

export function MarketingCloseCta() {
  return (
    <section className="hero-plane border-t border-[var(--brand-dark)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 sm:py-20 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl space-y-4">
          <p className="whitespace-pre-line font-sans text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {CLOSE_SLOGAN}
          </p>
          <p className="whitespace-pre-line text-base font-normal leading-relaxed text-[#e8f0e8] sm:text-lg">
            {CLOSE_SUPPORT}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/pricing#checkout" className="btn-on-dark px-5 py-3">
            {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
          </Link>
          <a href={DEMO_URL} className="btn-on-dark-outline px-5 py-3">
            Try the demo
          </a>
        </div>
      </div>
    </section>
  )
}
