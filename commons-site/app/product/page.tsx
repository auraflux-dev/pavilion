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
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="mb-5 inline-block rounded-full bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 ring-1 ring-zinc-200">
            Product
          </div>
          <h1 className="max-w-3xl whitespace-pre-line font-sans text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {`What boards run
in one place.`}
          </h1>
          <p className="mt-4 max-w-2xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-700 sm:text-lg">
            {`Your board works in Staff.
Parents get your public site and family login.
They see your school. Not Pavilion.`}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/pricing#checkout" className="btn-primary !px-5 !py-3">
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
