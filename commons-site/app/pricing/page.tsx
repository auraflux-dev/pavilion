import type { Metadata } from 'next'
import { StartForm } from '@/components/start-form'
import { PRODUCT_NAME } from '@/lib/brand'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'
import { stripeConfigured } from '@/lib/stripe'

export const metadata: Metadata = { title: 'Pricing' }

const FEATURES = [
  'Public site and family login for parents on your school brand',
  'Staff portal for your board: onboarding, connectors, and day-to-day work',
  'Domain and Google connect in Staff onboarding',
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
    <div className="bg-zinc-50 py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <span className="mb-5 inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
          Pricing
        </span>
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Pricing
        </h1>
        <p className="mb-8 max-w-xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-600 md:text-lg">
          {`One number.
$${COMMONS_LIST_PRICE_USD} per school per month.
12-month term. Same price as long as you stay.`}
        </p>

        <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="relative rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xl md:p-8 lg:col-span-7">
            <span className="absolute -top-3 right-6 rounded-full bg-emerald-900 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
              Standard Tier
            </span>
            <p className="flex items-baseline gap-1">
              <span className="text-5xl font-bold text-slate-900">${COMMONS_LIST_PRICE_USD}</span>
              <span className="text-xl font-normal text-slate-500">/mo</span>
            </p>
            <p className="mb-6 text-sm font-medium text-slate-500">
              ${year.toLocaleString()} / year billed annually
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
            className="scroll-mt-24 rounded-2xl border border-zinc-200/90 bg-zinc-50/50 p-6 shadow-sm lg:col-span-5"
          >
            <h2 className="mb-2 text-xl font-bold text-slate-900">Start checkout</h2>
            <p className="whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
              {`${PRODUCT_NAME} for your school.
Pay on Stripe (HSKRG LLC). Parent sales stay on your Square.
After pay, your board onboards in Staff.`}
            </p>
            {!ready ? (
              <p className="mt-4 whitespace-pre-line rounded-xl border border-zinc-200 bg-white p-4 text-sm font-normal leading-relaxed text-slate-600">
                {`Stripe checkout is not configured on this deploy yet.
You can still review the demo while we finish billing.`}
              </p>
            ) : null}
            <StartForm />
          </div>
        </div>
      </div>
    </div>
  )
}
