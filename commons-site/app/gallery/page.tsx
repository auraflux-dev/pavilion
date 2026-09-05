import type { Metadata } from 'next'
import Image from 'next/image'
import { GALLERY_ITEMS } from '@/lib/gallery'
import { PRODUCT_NAME } from '@/lib/brand'

export const metadata: Metadata = { title: 'Gallery' }

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl">Gallery</h1>
      <p className="mt-4 max-w-2xl whitespace-pre-line text-lg text-[var(--ink-muted)]">
        {`Builds on ${PRODUCT_NAME}.\nDemo, private trials, and live schools (with permission).`}
      </p>
      <ul className="mt-10 space-y-12">
        {GALLERY_ITEMS.map((item) => (
          <li key={item.id} className="border-t border-[var(--line)] pt-6">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">{item.kind}</p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              {item.title}
            </h2>
            <p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-[var(--ink-muted)]">
              {item.blurb}
            </p>
            {item.imageSrc ? (
              <div className="mt-5 space-y-4">
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--paper-deep)]">
                  <Image
                    src={item.imageSrc}
                    alt={item.imageAlt ?? item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 960px"
                    className="object-cover object-top"
                  />
                </div>
                {item.galleryImages?.length ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {item.galleryImages.map((img) => (
                      <div
                        key={img.src}
                        className="relative aspect-[16/10] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--paper-deep)]"
                      >
                        <Image
                          src={img.src}
                          alt={img.alt}
                          fill
                          sizes="(max-width: 768px) 100vw, 480px"
                          className="object-cover object-top"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 flex min-h-36 items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[var(--paper-deep)] px-4 text-center text-sm text-[var(--ink-muted)]">
                Screenshots appear here when a school allows it.
              </div>
            )}
            {item.href ? (
              <a
                href={item.href}
                className="mt-4 inline-block text-sm font-semibold text-[var(--accent)] hover:underline"
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
