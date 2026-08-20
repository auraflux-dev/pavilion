import type { Metadata } from 'next'
import { GALLERY_ITEMS } from '@/lib/gallery'
import { PRODUCT_NAME } from '@/lib/brand'

export const metadata: Metadata = { title: 'Gallery' }

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl">Gallery</h1>
      <p className="mt-4 whitespace-pre-line text-lg text-[var(--ink-muted)]">
        {`Builds on ${PRODUCT_NAME}.\nDemo, private trials, and live schools (with permission).`}
      </p>
      <ul className="mt-10 space-y-8">
        {GALLERY_ITEMS.map((item) => (
          <li key={item.id} className="border-t border-[var(--line)] pt-5">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">{item.kind}</p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">{item.title}</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-[var(--ink-muted)]">{item.blurb}</p>
            <div className="mt-4 flex min-h-36 items-center justify-center rounded-md bg-[var(--paper-deep)] text-sm text-[var(--ink-muted)]">
              Screenshot placeholder
            </div>
            {item.href ? (
              <a
                href={item.href}
                className="mt-3 inline-block text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                Open live
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
