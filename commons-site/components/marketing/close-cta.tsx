import Link from 'next/link'
import { CLOSE_SLOGAN, CLOSE_SUPPORT } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'

export function MarketingCloseCta() {
  return (
    <section className="hero-plane text-[#f7f5f0]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 sm:py-20 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl space-y-4">
          <p className="type-section whitespace-pre-line text-[#f7f5f0]">{CLOSE_SLOGAN}</p>
          <p className="type-lede whitespace-pre-line text-[#d5cec0]">{CLOSE_SUPPORT}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/pricing" className="btn-on-dark">
            {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
          </Link>
          <a href={DEMO_URL} className="btn-on-dark-outline">
            Try the demo
          </a>
        </div>
      </div>
    </section>
  )
}
