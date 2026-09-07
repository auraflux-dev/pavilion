import type { Metadata } from 'next'
import Link from 'next/link'
import { HELP_ARTICLES } from '@/lib/pavilion-site/help-articles'
import { PRODUCT_NAME } from '@/lib/pavilion-site/brand'

export const metadata: Metadata = { title: 'Help' }

export default function HelpIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="type-page">Help</h1>
      <p className="type-lede mt-4 whitespace-pre-line text-[var(--ink-muted)]">
        {`${PRODUCT_NAME} for creators and boards.\nThis is platform help, not a school ops knowledge base.`}
      </p>
      <ul className="mt-10 space-y-6">
        {HELP_ARTICLES.map((a) => (
          <li key={a.slug} className="border-t border-[var(--line)] pt-4">
            <Link
              href={`/help/${a.slug}`}
              className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)] hover:text-[var(--accent)]"
            >
              {a.title}
            </Link>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{a.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
