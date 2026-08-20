import type { Metadata } from 'next'
import { PARTNERS } from '@/lib/partners'
import { PRODUCT_NAME } from '@/lib/brand'

export const metadata: Metadata = { title: 'Partners' }

export default function PartnersPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl">Partners</h1>
      <p className="mt-4 whitespace-pre-line text-lg text-[var(--ink-muted)]">
        {`Tools that fit a ${PRODUCT_NAME} year.\nCurated. Not a paid ad wall.`}
      </p>
      <ul className="mt-10 space-y-6">
        {PARTNERS.map((p) => (
          <li key={p.name} className="border-t border-[var(--line)] pt-4">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">{p.category}</p>
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)] hover:text-[var(--accent)]"
            >
              {p.name}
            </a>
            <p className="mt-1 whitespace-pre-line text-sm text-[var(--ink-muted)]">{p.blurb}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
