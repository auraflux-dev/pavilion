import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingCloseCta } from '@/components/marketing/close-cta'
import { PROCESS } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Our process' }

export default function ProcessPage() {
  return (
    <>
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="badge-micro mb-5">{PROCESS.eyebrow}</div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            {PROCESS.headline}
          </h1>
          <p className="mt-4 max-w-2xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
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
      <section className="bg-zinc-50 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-5">
          <ol className="space-y-4">
            {PROCESS.steps.map((step) => (
              <li key={step.title} className="card-surface">
                <h2 className="text-lg font-semibold text-slate-900">{step.title}</h2>
                <p className="mt-3 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <MarketingCloseCta />
    </>
  )
}
