import Link from 'next/link'
import { SURFACES } from '@/lib/marketing'
import { BrowserFrame } from '@/components/marketing/browser-frame'

type SurfaceFramesProps = {
  linkToProduct?: boolean
  withAnchors?: boolean
}

export function MarketingSurfaceFrames({
  linkToProduct = false,
  withAnchors = false,
}: SurfaceFramesProps) {
  return (
    <section className="bg-[var(--paper)]">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] sm:text-4xl">
          Three surfaces.
          <br />
          One operating system.
        </h2>
        <p className="mt-4 max-w-2xl whitespace-pre-line text-[var(--ink-muted)]">
          {`Parents join and pay on your branded site.\nStaff run membership, events, and communications in one workspace.`}
        </p>
        <div className="mt-12 space-y-16">
          {SURFACES.map((surface, i) => {
            const title = linkToProduct ? (
              <Link href={surface.href} className="hover:text-[var(--accent)]">
                {surface.title}
              </Link>
            ) : (
              surface.title
            )
            const reverse = i % 2 === 1
            return (
              <div
                key={surface.id}
                id={withAnchors ? surface.id : undefined}
                className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-12 ${
                  withAnchors ? 'scroll-mt-24' : ''
                }`}
              >
                <div className={reverse ? 'lg:order-2' : undefined}>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                    {title}
                  </h3>
                  <p className="mt-3 whitespace-pre-line text-[var(--ink-muted)]">{surface.body}</p>
                </div>
                <div className={reverse ? 'lg:order-1' : undefined}>
                  <BrowserFrame src={surface.imageSrc} alt={surface.imageAlt} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
