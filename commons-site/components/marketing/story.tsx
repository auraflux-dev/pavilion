import { STORY } from '@/lib/marketing'

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
        <div className="badge-micro mb-5">Clear picture</div>
        <h2
          id="story-heading"
          className="max-w-3xl text-2xl font-bold tracking-tight text-slate-900 md:text-4xl"
        >
          Who Pavilion is for
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((b) => (
            <div key={b.label} className="card-surface">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                {b.label}
              </p>
              <p className="mt-3 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
                {b.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
