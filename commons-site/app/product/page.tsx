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
        <div className="mx-auto max-w-7xl px-4 pb-4 pt-10 sm:px-6 md:pb-6 md:pt-12 lg:px-8">
          <div className="badge-micro mb-5">Product</div>
          <h1 className="max-w-3xl whitespace-pre-line text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            {`What boards run
in one place.`}
          </h1>
          <p className="mt-4 mb-6 max-w-2xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-600 md:text-lg">
            {`Your board works in Staff.
Parents get your public site and family login.
They see your school. Not Pavilion.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing#checkout"
              className="rounded-xl bg-emerald-900 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-950"
            >
              {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
            </Link>
            <a
              href="#surfaces"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 font-semibold text-slate-800 transition-colors hover:bg-zinc-100"
            >
              Explore Surfaces ↓
            </a>
          </div>
        </div>
      </section>
      <MarketingSurfaceFrames withAnchors />
      <MarketingPillars />
      <MarketingCloseCta />
    </>
  )
}
