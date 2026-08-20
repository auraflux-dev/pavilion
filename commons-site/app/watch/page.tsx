import type { Metadata } from 'next'
import { WATCH_ITEMS } from '@/lib/gallery'
import { PRODUCT_NAME } from '@/lib/brand'

export const metadata: Metadata = { title: 'Watch' }

export default function WatchPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl">Watch</h1>
      <p className="mt-4 whitespace-pre-line text-lg text-[var(--ink-muted)]">
        {`Short explainers for ${PRODUCT_NAME}.\nReal videos replace these slots as we film them.`}
      </p>
      <ul className="mt-10 space-y-8">
        {WATCH_ITEMS.map((item) => (
          <li key={item.id} className="border-t border-[var(--line)] pt-5">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">{item.title}</h2>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">{item.duration}</p>
            <p className="mt-2 whitespace-pre-line text-sm text-[var(--ink-muted)]">{item.blurb}</p>
            <div className="mt-4 flex aspect-video items-center justify-center rounded-md bg-[var(--ink)] text-sm text-[var(--paper)]">
              Video placeholder
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
