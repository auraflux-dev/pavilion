import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingCloseCta } from '@/components/marketing/close-cta'
import { ABOUT } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="badge-micro mb-5">{ABOUT.eyebrow}</div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            {ABOUT.headline}
          </h1>
          <p className="mt-3 mb-6 max-w-xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-600 md:text-lg">
            {ABOUT.support}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={DEMO_URL}
              className="rounded-xl bg-emerald-900 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-950"
            >
              Try the demo
            </a>
            <Link
              href="/pricing"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 font-semibold text-slate-800 transition-colors hover:bg-zinc-100"
            >
              {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
            </Link>
          </div>
        </div>
      </section>
      <section className="bg-zinc-50 pt-10 pb-8 md:pt-14 md:pb-10">
        <div className="mx-auto max-w-6xl px-5">
          <ul className="grid gap-4 md:grid-cols-3">
            {ABOUT.points.map((point) => (
              <li key={point.title} className="card-surface">
                <h2 className="mb-2 text-lg font-semibold text-slate-900">{point.title}</h2>
                <p className="whitespace-pre-line text-sm font-normal leading-relaxed text-slate-600 md:text-base">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-base font-normal leading-relaxed text-slate-600">
            Want the path from tour to go-live?{' '}
            <Link href="/process" className="font-semibold text-emerald-900 hover:underline">
              See our process
            </Link>
            .
          </p>
        </div>
      </section>
      <MarketingCloseCta />
    </>
  )
}
