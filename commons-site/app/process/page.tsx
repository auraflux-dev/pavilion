import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingCloseCta } from '@/components/marketing/close-cta'
import { PROCESS_STEP_VISUALS } from '@/components/marketing/process-step-visuals'
import { PROCESS } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Our process' }

export default function ProcessPage() {
  return (
    <>
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 pb-4 pt-10 sm:px-6 md:pb-6 md:pt-12 lg:px-8">
          <span className="mb-4 inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
            {PROCESS.eyebrow}
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            {PROCESS.headline}
          </h1>
          <p className="mt-3 mb-6 max-w-2xl text-base font-normal leading-relaxed whitespace-pre-line text-slate-600 md:text-lg">
            {PROCESS.support}
          </p>
          <div className="flex flex-wrap gap-3">
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
          <ol className="list-none space-y-0 p-0">
            {PROCESS.steps.map((step, index) => {
              const stepLabel = String(index + 1).padStart(2, '0')
              const title = step.title.replace(/^\d+\.\s*/, '')
              const Visual = PROCESS_STEP_VISUALS[index]
              const isLast = index === PROCESS.steps.length - 1
              return (
                <li key={step.title} className="relative">
                  <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-start gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200/60 bg-emerald-50 text-sm font-bold text-emerald-900">
                        {stepLabel}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                        <p className="mt-2 whitespace-pre-line text-sm font-normal leading-relaxed text-slate-600 md:text-base">
                          {step.body}
                        </p>
                        {Visual ? <Visual /> : null}
                      </div>
                    </div>
                  </div>
                  {!isLast ? (
                    <div className="flex justify-center py-3" aria-hidden>
                      <div className="h-8 w-px border-l-2 border-dashed border-zinc-300" />
                    </div>
                  ) : null}
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
