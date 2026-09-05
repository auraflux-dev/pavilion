import Link from 'next/link'
import { PRODUCT_NAME } from '@/lib/brand'
import { HERO_HEADLINE, HERO_SUPPORT } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'
import { BrowserFrame } from '@/components/marketing/browser-frame'
import { PavilionMark } from '@/components/marketing/pavilion-mark'

export function MarketingHero() {
  return (
    <section className="hero-plane relative overflow-hidden text-[#f3efe6]">
      <div className="relative z-10 mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-end lg:gap-10 lg:pb-20 lg:pt-28">
        <div className="motion-rise flex min-h-[42vh] flex-col justify-end gap-6 lg:min-h-[70vh]">
          <div className="flex items-center gap-3">
            <PavilionMark className="h-8 w-8 text-[var(--accent-soft)] sm:h-10 sm:w-10" />
            <p className="font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight sm:text-6xl md:text-7xl">
              {PRODUCT_NAME}
            </p>
          </div>
          <h1 className="max-w-xl whitespace-pre-line font-[family-name:var(--font-display)] text-2xl leading-tight text-[#e8e1d4] sm:text-3xl">
            {HERO_HEADLINE}
          </h1>
          <p className="max-w-md whitespace-pre-line text-base text-[#cfc6b6] sm:text-lg">
            {HERO_SUPPORT}
          </p>
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
        <div className="motion-rise motion-rise-delay">
          <BrowserFrame
            src="/gallery/riverside-public.jpg"
            alt="Riverside demo public site"
            priority
            float
          />
        </div>
      </div>
    </section>
  )
}
