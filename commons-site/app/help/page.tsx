import type { Metadata } from 'next'
import Link from 'next/link'
import { HELP_ARTICLES } from '@/lib/help-articles'
import { PRODUCT_NAME } from '@/lib/brand'

export const metadata: Metadata = { title: 'Help' }

export default function HelpIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <div className="badge-micro mb-5">Help</div>
      <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
        Help
      </h1>
      <p className="mt-4 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
        {`${PRODUCT_NAME} for creators and boards.
Billing, buying, and product how-tos.
Day-to-day school ops live in your Staff Help after you launch.`}
      </p>
      <ul className="mt-10 space-y-4">
        {HELP_ARTICLES.map((a) => (
          <li key={a.slug} className="card-surface">
            <Link
              href={`/help/${a.slug}`}
              className="text-lg font-semibold text-slate-900 hover:text-emerald-900"
            >
              {a.title}
            </Link>
            <p className="mt-1 text-base font-normal leading-relaxed text-slate-600">{a.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
