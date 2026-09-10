import { STORY } from '@/lib/marketing'

/** Who / what / why / how / whom — BR bento cards, Pavilion copy. */
export function MarketingStory() {
  const blocks = [
    { label: 'Whom', body: STORY.whom },
    { label: 'Who', body: STORY.who },
    { label: 'What we do well', body: STORY.what },
    { label: 'Why', body: STORY.why },
    { label: 'How', body: STORY.how },
  ] as const

  return (
    <section className="bg-zinc-50 py-16 md:py-24" aria-labelledby="story-heading">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-5 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 ring-1 ring-zinc-200">
          Clear picture
        </div>
        <h2
          id="story-heading"
          className="max-w-3xl font-sans text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          Who Pavilion is for
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((b) => (
            <div key={b.label} className="card-surface">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
                {b.label}
              </p>
              <p className="mt-3 whitespace-pre-line text-base font-normal leading-relaxed text-slate-700">
                {b.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
