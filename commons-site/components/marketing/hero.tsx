import Link from 'next/link'
import { HERO_EYEBROW, HERO_HEADLINE, HERO_SUPPORT, SURFACES } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'
import { BrowserFrame } from '@/components/marketing/browser-frame'

export function MarketingHero() {
  const front = SURFACES[0]
  const supportLines = HERO_SUPPORT.split('\n').filter(Boolean)

  return (
    <section className="hero-plane relative overflow-hidden border-b border-[var(--brand-dark)]" aria-label="Welcome">
      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-5 pt-14 pb-16 md:pt-20 md:pb-24 lg:grid-cols-12 lg:gap-12">
        <div className="motion-rise lg:col-span-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5">
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand-accent)]"
              aria-hidden
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#eef6ee]">
              {HERO_EYEBROW}
            </span>
          </div>
          <h1 className="max-w-xl whitespace-pre-line font-sans text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
            {HERO_HEADLINE}
          </h1>
          <div className="copy-stack mt-6 text-lg text-[#e8f0e8] sm:text-xl">
            {supportLines.map((line) => (
              <p key={line} className="copy-stack__line text-[#e8f0e8]">
                {line}
              </p>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/pricing#checkout" className="btn-on-dark px-5 py-3">
              {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
            </Link>
            <a href={DEMO_URL} className="btn-on-dark-outline px-5 py-3">
              Try the demo
            </a>
          </div>
        </div>

        <div className="motion-rise motion-rise-delay mx-auto w-full max-w-xl lg:col-span-6 lg:max-w-none">
          <BrowserFrame
            src={front.imageSrc}
            alt={front.imageAlt}
            hostLabel={front.hostLabel}
            priority
            large
          />
        </div>
      </div>
    </section>
  )
}
