import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingCloseCta } from '@/components/marketing/close-cta'
import { ABOUT } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="mb-5 inline-block rounded-full bg-[var(--brand-mist)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] ring-1 ring-[var(--brand-line)]">
            {ABOUT.eyebrow}
          </div>
          <h1 className="font-sans text-4xl font-bold tracking-tight text-[var(--brand-text)] sm:text-5xl">
            {ABOUT.headline}
          </h1>
          <p className="mt-4 max-w-2xl whitespace-pre-line text-base font-normal leading-relaxed text-[var(--ink-muted)] sm:text-lg">
            {ABOUT.support}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={DEMO_URL} className="btn-primary !px-5 !py-3">
              Try the demo
            </a>
            <Link href="/pricing" className="btn-secondary">
              {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
            </Link>
          </div>
        </div>
      </section>
      <section className="bg-[var(--brand-mist)] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <ul className="grid gap-4 md:grid-cols-3">
            {ABOUT.points.map((point) => (
              <li key={point.title} className="card-surface">
                <h2 className="text-sm font-semibold text-[var(--brand-text)]">{point.title}</h2>
                <p className="mt-2 whitespace-pre-line text-sm font-normal leading-relaxed text-[var(--ink-muted)]">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-sm font-normal leading-relaxed text-[var(--ink-muted)]">
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
