import Link from 'next/link'
import { CLOSE_SLOGAN, CLOSE_SUPPORT } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'

export function MarketingCloseCta() {
  return (
    <section className="surface-dark border-t border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 sm:py-20 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl space-y-4">
          <p className="whitespace-pre-line font-sans text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {CLOSE_SLOGAN}
          </p>
          <p className="whitespace-pre-line text-base font-normal leading-relaxed text-slate-300 sm:text-lg">
            {CLOSE_SUPPORT}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/pricing#checkout"
            className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:bg-slate-100"
          >
            {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
          </Link>
          <a
            href={DEMO_URL}
            className="rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
          >
            Try the demo
          </a>
        </div>
      </div>
    </section>
  )
}
