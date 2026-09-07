import type { Metadata } from 'next'
import { StartForm } from '@/components/pavilion-site/start-form'
import { PRODUCT_NAME } from '@/lib/pavilion-site/brand'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pavilion-site/pricing'
import { stripeConfigured } from '@/lib/pavilion-site/stripe'

export const metadata: Metadata = { title: 'Pricing' }

export default function PricingPage() {
  const year = COMMONS_LIST_PRICE_USD * 12
  const ready = stripeConfigured()

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="type-page">Pricing</h1>
      <p className="type-lede mt-4 whitespace-pre-line text-[var(--ink-muted)]">
        {`One number.
$${COMMONS_LIST_PRICE_USD} per school per month.
12-month term. Same price as long as you stay.`}
      </p>

      <div className="mt-10 rounded-lg border border-[var(--line)] bg-[var(--paper-deep)] p-6">
        <p className="type-price text-[var(--ink)]">
          ${COMMONS_LIST_PRICE_USD}
          <span className="type-title font-normal text-[var(--ink-muted)]">/mo</span>
        </p>
        <p className="type-small mt-2 text-[var(--ink-muted)]">${year.toLocaleString()}/year</p>
        <ul className="type-body mt-6 space-y-2 text-[var(--ink)]">
          <li>Public site and family login for parents on your school brand</li>
          <li>Staff portal for your board: onboarding, connectors, and day-to-day work</li>
          <li>Domain and Google connect in Staff onboarding</li>
          <li>No separate setup invoice</li>
          <li>Parent card fees stay on your school Square</li>
        </ul>
      </div>

      <div className="mt-12 border-t border-[var(--line)] pt-10" id="checkout">
        <h2 className="type-title text-[var(--ink)]">Start checkout</h2>
        <p className="type-body mt-2 whitespace-pre-line text-[var(--ink-muted)]">
          {`${PRODUCT_NAME} for your school.
Pay on Stripe (HSKRG LLC). Parent sales stay on your Square.
After pay, your board onboards in Staff.`}
        </p>
        {!ready ? (
          <p className="mt-6 whitespace-pre-line rounded-md border border-[var(--line)] bg-[var(--paper-deep)] p-4 text-sm text-[var(--ink-muted)]">
            {`Stripe checkout is not configured on this deploy yet.
You can still review the demo while we finish billing.`}
          </p>
        ) : null}
        <StartForm />
      </div>
    </div>
  )
}
