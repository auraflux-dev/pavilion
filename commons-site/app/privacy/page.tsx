import type { Metadata } from 'next'
import Link from 'next/link'
import { LEGAL_ENTITY, PRODUCT_NAME } from '@/lib/brand'
import { CONTACT_EMAIL } from '@/lib/pricing'

export const metadata: Metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <section className="bg-[var(--brand-mist)] py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-5">
        <div className="mb-5 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] ring-1 ring-[var(--brand-line)]">
          Legal
        </div>
        <h1 className="font-sans text-3xl font-bold tracking-tight text-[var(--brand-text)] sm:text-4xl">
          Privacy Policy
        </h1>
        <div className="card-surface mt-8 space-y-4 text-base font-normal leading-relaxed text-[var(--ink-muted)]">
          <p>
            {PRODUCT_NAME} is a product of {LEGAL_ENTITY}. This page summarizes how we handle
            information you share through onpavilion.com marketing and checkout.
          </p>
          <p>
            Account and billing data is processed for service delivery. School community data lives
            in your organization workspace, not on this marketing site.
          </p>
          <p>
            Questions:{' '}
            <a className="font-semibold text-[var(--brand-primary)] hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>
            <Link href="/terms" className="font-semibold text-[var(--brand-primary)] hover:underline">
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
