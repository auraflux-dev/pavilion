import type { Metadata } from 'next'
import { StartForm } from '@/components/start-form'
import { PRODUCT_NAME } from '@/lib/brand'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'
import { stripeConfigured } from '@/lib/stripe'

export const metadata: Metadata = { title: 'Pricing' }

export default function PricingPage() {
  const year = COMMONS_LIST_PRICE_USD * 12
  const ready = stripeConfigured()

  return (
    <div className="bg-zinc-50 py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-5">
        <div className="badge-micro mb-5">Pricing</div>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
          Pricing
        </h1>
        <p className="mt-4 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
          {`One number.
$${COMMONS_LIST_PRICE_USD} per school per month.
12-month term. Same price as long as you stay.`}
        </p>

        <div className="card-surface mt-10">
          <p className="type-price text-slate-900">
            ${COMMONS_LIST_PRICE_USD}
            <span className="type-title font-normal text-slate-600">/mo</span>
          </p>
          <p className="mt-2 text-base font-normal leading-relaxed text-slate-600">
            ${year.toLocaleString()}/year
          </p>
          <ul className="mt-6 space-y-2 text-base font-normal leading-relaxed text-slate-600">
            <li>Public site and family login for parents on your school brand</li>
            <li>Staff portal for your board: onboarding, connectors, and day-to-day work</li>
            <li>Domain and Google connect in Staff onboarding</li>
            <li>No separate setup invoice</li>
            <li>Parent card fees stay on your school Square</li>
          </ul>
        </div>

        <div className="card-surface mt-8" id="checkout">
          <h2 className="text-lg font-semibold text-slate-900">Start checkout</h2>
          <p className="mt-2 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
            {`${PRODUCT_NAME} for your school.
Pay on Stripe (HSKRG LLC). Parent sales stay on your Square.
After pay, your board onboards in Staff.`}
          </p>
          {!ready ? (
            <p className="mt-6 whitespace-pre-line rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-base font-normal leading-relaxed text-slate-600">
              {`Stripe checkout is not configured on this deploy yet.
You can still review the demo while we finish billing.`}
            </p>
          ) : null}
          <StartForm />
        </div>
      </div>
    </div>
  )
}
