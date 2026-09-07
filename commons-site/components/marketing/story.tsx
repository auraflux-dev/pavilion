import { STORY } from '@/lib/marketing'

/** Who / what / why / how / whom — one composition for marketing clarity. */
export function MarketingStory() {
  const blocks = [
    { label: 'Whom', body: STORY.whom },
    { label: 'Who', body: STORY.who },
    { label: 'What we do well', body: STORY.what },
    { label: 'Why', body: STORY.why },
    { label: 'How', body: STORY.how },
  ] as const

  return (
    <section className="border-b border-[var(--line)] bg-[var(--paper-deep)]">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <p className="type-eyebrow text-[var(--accent)]">Clear picture</p>
        <h2 className="type-title mt-2 text-[var(--ink)]">Who Pavilion is for</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((b) => (
            <div key={b.label} className="border-t border-[var(--line)] pt-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
                {b.label}
              </p>
              <p className="type-body mt-2 whitespace-pre-line text-[var(--ink-muted)]">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
