import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingCloseCta } from '@/components/marketing/close-cta'
import { MarketingPillars } from '@/components/marketing/pillars'
import { MarketingSurfaceFrames } from '@/components/marketing/surface-frames'
import { PRODUCT_NAME } from '@/lib/brand'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Product' }

export default function ProductPage() {
  return (
    <>
      <section className="border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Product
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--ink)] sm:text-5xl">
            {PRODUCT_NAME}
          </h1>
          <p className="mt-4 max-w-2xl whitespace-pre-line text-lg text-[var(--ink-muted)]">
            {`Three surfaces.\nOne operating system for the school year.`}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/start"
              className="rounded-md bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper)] hover:bg-[var(--accent)]"
            >
              {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
            </Link>
            <Link
              href="/pricing"
              className="rounded-md border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
            >
              Pricing
            </Link>
          </div>
        </div>
      </section>
      <MarketingPillars />
      <MarketingSurfaceFrames withAnchors />
      <MarketingCloseCta />
    </>
  )
}
