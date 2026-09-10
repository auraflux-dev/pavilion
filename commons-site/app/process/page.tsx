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
          <p className="mt-3 mb-6 max-w-xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-600 md:text-lg">
            {PROCESS.support}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={DEMO_URL}
              className="rounded-xl bg-emerald-900 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-950"
            >
              Start with the demo
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
      <section className="bg-zinc-50 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-5">
          <ol className="list-none space-y-0 p-0">
            {PROCESS.steps.map((step, index) => {
              const stepLabel = `Step ${String(index + 1).padStart(2, '0')}`
              const title = step.title.replace(/^\d+\.\s*/, '')
              return (
                <li
                  key={step.title}
                  className="mb-4 rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm transition-all hover:shadow-md"
                >
                  <span className="mb-3 inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-900">
                    {stepLabel}
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                  <p className="mt-3 whitespace-pre-line text-sm font-normal leading-relaxed text-slate-600 md:text-base">
                    {step.body}
                  </p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>
      <MarketingCloseCta />
    </>
  )
}
