import Link from 'next/link'
import { CLOSE_SLOGAN } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'

export function MarketingCloseCta() {
  return (
    <section className="hero-plane text-[#f3efe6]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 sm:py-20 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl space-y-4">
          <p className="whitespace-pre-line font-[family-name:var(--font-display)] text-3xl leading-tight sm:text-4xl">
            {CLOSE_SLOGAN}
          </p>
          <p className="text-[#cfc6b6]">
            Start with a branded trial, or tour the Riverside demo first.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/start"
            className="rounded-md bg-[#f3efe6] px-5 py-3 text-sm font-semibold text-[#12231f] hover:bg-white"
          >
            {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
          </Link>
          <a
            href={DEMO_URL}
            className="rounded-md border border-[#f3efe6]/50 px-5 py-3 text-sm font-semibold text-[#f3efe6] hover:bg-white/10"
          >
            Try the demo
          </a>
        </div>
      </div>
    </section>
  )
}
