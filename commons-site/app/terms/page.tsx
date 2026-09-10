import type { Metadata } from 'next'
import Link from 'next/link'
import { LEGAL_ENTITY, PRODUCT_NAME } from '@/lib/brand'
import { CONTACT_EMAIL } from '@/lib/pricing'

export const metadata: Metadata = {
  title: 'Terms of Service',
}

export default function TermsPage() {
  return (
    <section className="bg-zinc-50 py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-5">
        <div className="mb-5 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 ring-1 ring-zinc-200">
          Legal
        </div>
        <h1 className="font-sans text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Terms of Service
        </h1>
        <div className="card-surface mt-8 space-y-4 text-base font-normal leading-relaxed text-slate-700">
          <p>
            {PRODUCT_NAME} software and related services are provided by {LEGAL_ENTITY}. Use of the
            product is subject to your subscription agreement and these site terms.
          </p>
          <p>
            Marketing copy on this site describes the product. Your live school site, family login,
            and Staff workspace are governed by your org agreement and applicable policies.
          </p>
          <p>
            Questions:{' '}
            <a className="font-semibold text-[var(--brand-primary)] hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>
            <Link href="/privacy" className="font-semibold text-[var(--brand-primary)] hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
