import type { PageContentFields } from '@/lib/api/page-content'

type Props = {
  content: Pick<PageContentFields, 'eyebrow' | 'title' | 'body' | 'flyerImage'>
  /** Tighter padding for portal-style pages */
  compact?: boolean
}

/** Shared green marketing hero driven by PageContent / defaults. */
export function PageHero({ content, compact }: Props) {
  const flyer = content.flyerImage?.trim()

  return (
    <section
      className={compact ? 'py-12 md:py-16' : 'py-16 md:py-24'}
      style={{ backgroundColor: 'var(--brand-green)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {content.eyebrow ? (
          <div
            className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
          >
            {content.eyebrow}
          </div>
        ) : null}
        <h1
          className={`font-bold text-white ${
            compact ? 'text-3xl sm:text-4xl mb-2' : 'text-4xl sm:text-5xl lg:text-6xl mb-6'
          }`}
        >
          {content.title}
        </h1>
        {content.body ? (
          <p
            className={`text-white/80 max-w-2xl mx-auto leading-relaxed ${
              compact ? 'text-base text-white/70' : 'text-lg'
            }`}
          >
            {content.body}
          </p>
        ) : null}
        {flyer ? (
          <div className="mt-8 mx-auto max-w-3xl overflow-hidden rounded-xl border border-white/20 bg-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={flyer}
              alt=""
              className="w-full max-h-[420px] object-contain bg-white/5"
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
