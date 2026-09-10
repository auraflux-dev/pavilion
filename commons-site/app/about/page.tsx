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
          <p className="mt-4 max-w-2xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
            {ABOUT.support}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={DEMO_URL} className="btn-primary">
              Try the demo
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
                <h2 className="text-lg font-semibold text-slate-900">{point.title}</h2>
                <p className="mt-2 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-base font-normal leading-relaxed text-slate-600">
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
