import type { Metadata } from 'next'
import Link from 'next/link'
import { ABOUT } from '@/lib/marketing'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <div className="bg-zinc-50">
      <div className="mx-auto max-w-6xl px-5 pt-16 pb-16 sm:pt-20 sm:pb-20">
        <span className="mb-4 inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
          {ABOUT.eyebrow}
        </span>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
          {ABOUT.headline}
        </h1>
        <p className="mt-3 mb-6 max-w-2xl text-base font-normal leading-relaxed whitespace-pre-line text-slate-600 md:text-lg">
          {ABOUT.support}
        </p>
        <div className="mb-12 flex flex-wrap gap-3 md:mb-14">
          <a
            href={DEMO_URL}
            className="rounded-xl bg-emerald-900 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-950"
          >
            Try the demo
          </a>
          <Link
            href="/pricing"
            className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 font-semibold text-slate-800 transition-colors hover:bg-zinc-100"
          >
            {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
          </Link>
        </div>

        <ul className="grid gap-4 md:grid-cols-3 md:items-stretch">
          {ABOUT.points.map((point) => (
            <li
              key={point.title}
              className="flex h-full flex-col rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm"
            >
              <h2 className="mb-2 text-lg font-semibold text-slate-900">{point.title}</h2>
              <p className="whitespace-pre-line text-sm font-normal leading-relaxed text-slate-600 md:text-base">
                {point.body}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-base font-normal leading-relaxed text-slate-600">
          Prefer the full path?{' '}
          <Link href="/process" className="font-semibold text-emerald-900 hover:underline">
            See our process
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
