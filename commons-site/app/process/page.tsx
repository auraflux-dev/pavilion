import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingCloseCta } from '@/components/marketing/close-cta'
import { PROCESS } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Our process' }

export default function ProcessPage() {
  return (
    <>
      <section className="border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="type-eyebrow text-[var(--accent)]">{PROCESS.eyebrow}</p>
          <h1 className="type-page mt-2 text-[var(--ink)]">{PROCESS.headline}</h1>
          <p className="type-lede mt-4 max-w-2xl whitespace-pre-line text-[var(--ink-muted)]">
            {PROCESS.support}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={DEMO_URL} className="btn-primary">
              Start with the demo
            </a>
            <Link href="/pricing" className="btn-secondary">
              {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
            </Link>
          </div>
        </div>
      </section>
      <section className="bg-[var(--paper)]">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
          <ol className="space-y-10">
            {PROCESS.steps.map((step) => (
              <li key={step.title} className="border-t border-[var(--line)] pt-6">
                <h2 className="type-title text-[var(--ink)]">{step.title}</h2>
                <p className="type-body mt-3 whitespace-pre-line text-[var(--ink-muted)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <MarketingCloseCta />
    </>
  )
}
