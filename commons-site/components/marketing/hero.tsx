import Link from 'next/link'
import { DemoBookingLink } from '@/components/demo-booking-link'
import { HeroOsPreview } from '@/components/marketing/hero-os-preview'
import { HERO_EYEBROW, HERO_HEADLINE, HERO_SUPPORT } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'

export function MarketingHero() {
  const supportLines = HERO_SUPPORT.split('\n').filter(Boolean)

  return (
    <section className="border-b border-zinc-200 bg-zinc-50 pb-16 md:pb-24" aria-label="Welcome">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pt-12 sm:px-6 md:pt-16 lg:grid-cols-12 lg:gap-12 lg:px-8">
        <div className="motion-rise lg:col-span-6">
          <div className="mb-4 inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
            {HERO_EYEBROW}
          </div>
          <h1 className="mb-4 block whitespace-pre-line text-4xl font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {HERO_HEADLINE}
          </h1>
          <div className="mb-6 max-w-2xl space-y-1 text-base font-normal leading-relaxed text-slate-600 md:text-lg">
            {supportLines.map((line) => (
              <p key={line} className="text-base font-normal leading-relaxed text-slate-600 md:text-lg">
                {line}
              </p>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing#checkout" className="btn-primary">
              {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
            </Link>
            <DemoBookingLink className="btn-secondary">Book a demo</DemoBookingLink>
          </div>
        </div>

        <div className="motion-rise motion-rise-delay lg:col-span-6">
          <HeroOsPreview />
        </div>
      </div>
    </section>
  )
}
