import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingCloseCta } from '@/components/marketing/close-cta'
import { MarketingPillars } from '@/components/marketing/pillars'
import { ProductPreviewCards } from '@/components/marketing/product-preview-cards'
import { MarketingSurfaceFrames } from '@/components/marketing/surface-frames'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Product' }

export default function ProductPage() {
  return (
    <>
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 pb-4 pt-10 sm:px-6 md:pb-6 md:pt-12 lg:px-8">
          <span className="mb-4 inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
            Product
          </span>
          <h1 className="max-w-3xl whitespace-pre-line text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            {`What your PTO runs
in one place.`}
          </h1>
          <p className="mt-3 mb-6 max-w-2xl text-base font-normal leading-relaxed whitespace-pre-line text-slate-600 md:text-lg">
            {`Your team works in Staff.
Parents get your public site and family login.
They see your school. Not Pavilion.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing#checkout" className="btn-primary">
              {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
            </Link>
            <a href="#surfaces" className="btn-secondary">
              Explore Surfaces ↓
            </a>
          </div>
        </div>
      </section>
      <ProductPreviewCards />
      <MarketingSurfaceFrames withAnchors />
      <MarketingPillars />
      <MarketingCloseCta />
    </>
  )
}
