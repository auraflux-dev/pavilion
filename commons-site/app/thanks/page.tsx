import type { Metadata } from 'next'
import Link from 'next/link'
import { DEMO_URL } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Thanks' }

export default function ThanksPage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl">Thank you</h1>
      <p className="mt-4 whitespace-pre-line text-lg text-[var(--ink-muted)]">
        {`If you finished Square checkout, we have your school on the list.\nAuraflux will email you within one business day with next steps.`}
      </p>
      <p className="mt-6 whitespace-pre-line text-sm text-[var(--ink-muted)]">
        {`While you wait, walk the Riverside demo as a board member.`}
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
