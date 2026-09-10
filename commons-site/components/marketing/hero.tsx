import Link from 'next/link'
import { HERO_EYEBROW, HERO_HEADLINE, HERO_SUPPORT, SURFACES } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'
import { BrowserFrame } from '@/components/marketing/browser-frame'

export function MarketingHero() {
  const front = SURFACES[0]
  const supportLines = HERO_SUPPORT.split('\n').filter(Boolean)

  return (
    <section className="border-b border-zinc-200 bg-zinc-50 pt-14 pb-16 md:pt-20 md:pb-24" aria-label="Welcome">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-12 lg:gap-12">
        <div className="motion-rise lg:col-span-6">
          <div className="badge-micro mb-6">{HERO_EYEBROW}</div>
          <h1 className="max-w-xl whitespace-pre-line text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            {HERO_HEADLINE}
          </h1>
          <div className="copy-stack mt-4 mb-6 text-base font-normal leading-relaxed text-slate-600">
            {supportLines.map((line) => (
              <p key={line} className="copy-stack__line text-base font-normal leading-relaxed text-slate-600">
                {line}
              </p>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing#checkout" className="btn-primary">
              {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
            </Link>
            <a href={DEMO_URL} className="btn-secondary">
              Try the demo
            </a>
          </div>
        </div>

        <div className="motion-rise motion-rise-delay lg:col-span-6">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-2 shadow-xl">
            <BrowserFrame
              src={front.imageSrc}
              alt={front.imageAlt}
              hostLabel={front.hostLabel}
              priority
              large
            />
          </div>
        </div>
      </div>
    </section>
  )
}
