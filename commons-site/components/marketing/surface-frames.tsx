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
        <h2 className="type-section text-[var(--ink)]">
          Public. Family. Staff.
        </h2>
        <p className="type-lede mt-4 max-w-2xl whitespace-pre-line text-[var(--ink-muted)]">
          {`What each surface includes.\nSame product. Same brand. Different jobs.`}
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
                className={`grid items-start gap-8 lg:grid-cols-2 lg:gap-12 ${
                  withAnchors ? 'scroll-mt-24' : ''
                }`}
              >
                <div className={reverse ? 'lg:order-2' : undefined}>
                  <p className="type-eyebrow text-[var(--accent)]">{surface.tagline}</p>
                  <h3 className="type-title mt-2 text-[var(--ink)]">{title}</h3>
                  <p className="type-body mt-3 whitespace-pre-line text-[var(--ink-muted)]">{surface.body}</p>
                  <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                    {surface.benefits.map((benefit) => (
                      <li key={benefit} className="type-small flex gap-2 text-[var(--ink)]">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={reverse ? 'lg:order-1' : undefined}>
                  <BrowserFrame
                    src={surface.imageSrc}
                    alt={surface.imageAlt}
                    hostLabel={surface.hostLabel}
                    large={surface.id === 'staff'}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
