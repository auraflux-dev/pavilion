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
    <section className="bg-zinc-50 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Public. Family. Staff.
        </h2>
        <p className="mt-4 max-w-2xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
          {`What each surface includes.\nSame product. Same brand. Different jobs.`}
        </p>
        <div className="mt-12 space-y-16">
          {SURFACES.map((surface, i) => {
            const title = linkToProduct ? (
              <Link href={surface.href} className="hover:text-emerald-900">
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
                <div className={`card-surface ${reverse ? 'lg:order-2' : ''}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                    {surface.tagline}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
                  <p className="mt-3 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
                    {surface.body}
                  </p>
                  <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                    {surface.benefits.map((benefit) => (
                      <li
                        key={benefit}
                        className="flex gap-2 text-base font-normal leading-relaxed text-slate-600"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-900" aria-hidden />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={reverse ? 'lg:order-1' : undefined}>
                  <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-2 shadow-sm">
                    <BrowserFrame
                      src={surface.imageSrc}
                      alt={surface.imageAlt}
                      hostLabel={surface.hostLabel}
                      large={surface.id === 'staff'}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
