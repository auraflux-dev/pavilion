import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingCloseCta } from '@/components/marketing/close-cta'
import { ABOUT } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="mb-5 inline-block rounded-full bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 ring-1 ring-zinc-200">
            {ABOUT.eyebrow}
          </div>
          <h1 className="font-sans text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {ABOUT.headline}
          </h1>
          <p className="mt-4 max-w-2xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-700 sm:text-lg">
            {ABOUT.support}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={DEMO_URL} className="btn-primary !px-5 !py-3">
              Try the Riverside demo
            </a>
            <Link href="/pricing" className="btn-secondary">
              {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
            </Link>
          </div>
        </div>
      </section>
      <section className="bg-zinc-50 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <ul className="grid gap-4 md:grid-cols-3">
            {ABOUT.points.map((point) => (
              <li key={point.title} className="card-surface">
                <h2 className="text-sm font-semibold text-slate-900">{point.title}</h2>
                <p className="mt-2 whitespace-pre-line text-sm font-normal leading-relaxed text-slate-700">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-sm font-normal leading-relaxed text-slate-700">
            Want the path from tour to go-live?{' '}
            <Link href="/process" className="font-semibold text-[var(--brand-primary)] hover:underline">
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
