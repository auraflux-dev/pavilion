import Link from 'next/link'
import { DemoBookingLink } from '@/components/demo-booking-link'
import { CLOSE_SLOGAN, CLOSE_SUPPORT } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'

export function MarketingCloseCta() {
  return (
    <section className="border-t border-emerald-950 bg-emerald-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 sm:py-20 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl space-y-4">
          <p className="whitespace-pre-line text-2xl font-bold tracking-tight text-white md:text-4xl">
            {CLOSE_SLOGAN}
          </p>
          <p className="whitespace-pre-line text-base font-normal leading-relaxed text-emerald-100">
            {CLOSE_SUPPORT}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/pricing#checkout"
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition-colors hover:bg-zinc-100"
          >
            {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
          </Link>
          <DemoBookingLink className="rounded-xl border border-white/40 bg-transparent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
            Book a demo
          </DemoBookingLink>
        </div>
      </div>
    </section>
  )
}
