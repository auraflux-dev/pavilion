import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingCloseCta } from '@/components/marketing/close-cta'
import { MarketingPillars } from '@/components/marketing/pillars'
import { MarketingSurfaceFrames } from '@/components/marketing/surface-frames'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Product' }

export default function ProductPage() {
  return (
    <>
      <section className="border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="type-eyebrow text-[var(--accent)]">Product</p>
          <h1 className="type-page mt-2 text-[var(--ink)]">Run your whole PTO in one place.</h1>
          <p className="type-lede mt-4 max-w-2xl whitespace-pre-line text-[var(--ink-muted)]">
            {`Your board works in Staff.\nParents get your public site and family login.\nThey see your school. Not Pavilion.`}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/pricing#checkout" className="btn-primary">
              {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
            </Link>
            <Link href="/pricing" className="btn-secondary">
              Pricing
            </Link>
          </div>
        </div>
      </section>
      <MarketingSurfaceFrames withAnchors />
      <MarketingPillars />
      <MarketingCloseCta />
    </>
  )
}
