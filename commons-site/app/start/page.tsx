import type { Metadata } from 'next'
import { StartForm } from '@/components/start-form'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'
import { squareConfigured } from '@/lib/square'

export const metadata: Metadata = { title: 'Start' }

export default function StartPage() {
  const ready = squareConfigured()
  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl">Start</h1>
      <p className="mt-4 whitespace-pre-line text-lg text-[var(--ink-muted)]">
        {`Commons for your school.\n$${COMMONS_LIST_PRICE_USD} per month on Square.`}
      </p>
      {!ready ? (
        <p className="mt-6 whitespace-pre-line rounded-md border border-[var(--line)] bg-[var(--paper-deep)] p-4 text-sm text-[var(--ink-muted)]">
          {`Square checkout is not configured on this deploy yet.\nYou can still review the demo while we finish billing.`}
        </p>
      ) : null}
      <StartForm />
    </div>
  )
}
