import type { Metadata } from 'next'
import { StartForm } from '@/components/start-form'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'
import { stripeConfigured } from '@/lib/stripe'

export const metadata: Metadata = { title: 'Pricing' }

const FEATURES = [
  'Public site and family login for parents on your school brand',
  'Staff portal for your board: setup, tools, and day-to-day work',
  'Unlimited parents, volunteers, and chairs with zero per-user fees',
  'Domain and Google connect in Staff setup',
  'No separate setup invoice',
  'Parent card fees stay on your school Square',
] as const

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-900"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
    >
      <path d="M4 10.5 8.2 14.5 16 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PricingPage() {
  const year = COMMONS_LIST_PRICE_USD * 12
  const ready = stripeConfigured()

  return (
    <div className="bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <span className="mb-4 inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
          Pricing
        </span>
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Pricing
        </h1>
        <p className="mb-2 max-w-xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-700 md:text-lg">
          {`One number.
$${COMMONS_LIST_PRICE_USD} per school per month.
12-month term. Same price as long as you stay.`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl mx-auto pt-6 pb-16 px-4">
        <div className="relative rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xl md:p-8 lg:col-span-7">
          <span className="mb-4 inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
            PTO Annual Plan
          </span>
          <p className="flex items-baseline gap-1">
            <span className="text-5xl font-bold text-slate-900">${COMMONS_LIST_PRICE_USD}</span>
            <span className="text-xl font-normal text-slate-500">/mo</span>
          </p>
          <p className="mb-6 text-sm font-medium text-slate-700">
            ${year.toLocaleString()} / year billed annually. Lock in your rate for life.
          </p>
          <ul className="space-y-3">
            {FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex gap-2.5 text-sm font-medium leading-relaxed text-slate-700 md:text-base"
              >
                <CheckIcon />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          id="checkout"
          className="scroll-mt-24 rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-lg md:p-8 lg:col-span-5"
        >
          <h2 className="mb-2 text-xl font-bold text-slate-900">Get started with Pavilion</h2>
          <p className="text-base font-normal leading-relaxed text-slate-700">
            Lock in your school&apos;s workspace for the upcoming year.
          </p>
          {!ready ? (
            <p className="mt-4 whitespace-pre-line rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-normal leading-relaxed text-slate-600">
              {`Online signup is not open on this site yet.
You can still book a demo or email us to start.`}
            </p>
          ) : null}
          <StartForm />
        </div>
      </div>
    </div>
  )
}
