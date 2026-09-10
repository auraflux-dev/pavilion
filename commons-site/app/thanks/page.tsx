import type { Metadata } from 'next'
import Link from 'next/link'
import { DEMO_URL } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Thanks' }

export default function ThanksPage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <h1 className="type-page">Thank you</h1>
      <p className="type-lede mt-4 whitespace-pre-line text-[var(--ink-muted)]">
        {`If you finished Stripe checkout, we have your school on the list.\nHSKRG will email you within one business day with next steps.`}
      </p>
      <p className="mt-6 whitespace-pre-line text-sm text-[var(--ink-muted)]">
        {`While you wait, walk the product demo as a board member.`}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={DEMO_URL}
          className="rounded-md bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper)] hover:bg-[var(--accent)]"
        >
          Open the demo
        </a>
        <Link href="/" className="rounded-md border border-[var(--line)] px-5 py-3 text-sm font-semibold">
          Back home
        </Link>
      </div>
    </div>
  )
}
