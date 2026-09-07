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
          <p className="type-eyebrow text-[var(--accent)]">{ABOUT.eyebrow}</p>
          <h1 className="type-page mt-2 text-[var(--ink)]">{ABOUT.headline}</h1>
          <p className="type-lede mt-4 max-w-2xl whitespace-pre-line text-[var(--ink-muted)]">
            {ABOUT.support}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={DEMO_URL} className="btn-primary">
              Try the Riverside demo
            </a>
            <Link href="/pricing" className="btn-secondary">
              {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
            </Link>
          </div>
        </div>
      </section>
      <section className="bg-[var(--paper-deep)]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <ul className="grid gap-8 md:grid-cols-3">
            {ABOUT.points.map((point) => (
              <li key={point.title} className="border-t border-[var(--line)] pt-5">
                <h2 className="type-ui text-[var(--ink)]">{point.title}</h2>
                <p className="type-small mt-2 whitespace-pre-line text-[var(--ink-muted)]">{point.body}</p>
              </li>
            ))}
          </ul>
          <p className="type-small mt-10 text-[var(--ink-muted)]">
            Want the path from tour to go-live?{' '}
            <Link href="/process" className="font-semibold text-[var(--accent)] hover:underline">
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
