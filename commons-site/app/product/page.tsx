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
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="badge-micro mb-5">Product</div>
          <h1 className="max-w-3xl whitespace-pre-line text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            {`What boards run
in one place.`}
          </h1>
          <p className="mt-4 max-w-2xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
            {`Your board works in Staff.
Parents get your public site and family login.
They see your school. Not Pavilion.`}
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
