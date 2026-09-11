export function MarketingStory() {
  const cards = [
    {
      label: "WHO IT'S FOR",
      title: 'PTOs, PTAs & Booster Clubs',
      body: `Designed specifically for school community groups.\nParents see your school identity from day one.\nNever vendor branding.`,
      highlight: false,
    },
    {
      label: 'THE PLATFORM',
      title: 'The Complete Operating System',
      body: `A single, unified platform that replaces scattered spreadsheets,\nseparate sign-up tools, and personal Google Drives.`,
      highlight: false,
    },
    {
      label: 'WHAT YOU GET',
      title: 'Public, Family & Staff Surfaces',
      body: `One custom-branded public site,\na single household login for families,\nand back-office workspaces built for smooth officer transitions.`,
      highlight: true,
    },
    {
      label: 'WHY IT MATTERS',
      title: 'Built for Annual Continuity',
      body: `When leadership changes each year,\nyour history, donor lists, and past event assets\nstay safely attached to the school.`,
      highlight: false,
    },
    {
      label: 'HOW IT WORKS',
      title: 'Guided 30-Minute Launch',
      body: `Test drive with a branded trial,\ncustomize your workspace in Staff,\nand go live with continuous 1-on-1 team support.`,
      highlight: false,
    },
  ] as const

  return (
    <section className="bg-zinc-50 py-16 md:py-24" aria-labelledby="story-heading">
      <div className="mx-auto max-w-6xl px-5">
        <div className="badge-micro mb-4">At a glance</div>
        <h2
          id="story-heading"
          className="max-w-3xl text-2xl font-bold tracking-tight text-slate-900 md:text-4xl"
        >
          Built for school leaders.
          <br />
          Invisible to parents.
        </h2>
        <p className="lede-standard mt-3 mb-6 max-w-2xl text-base font-normal leading-relaxed text-slate-600 md:text-lg">
          Everything your organization needs to run smoothly, stay organized, and look
          professional.
        </p>

        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.label}
              className={
                card.highlight
                  ? 'card-surface border-emerald-200 bg-emerald-50/50'
                  : 'card-surface'
              }
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                {card.label}
              </p>
              <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-900 md:text-xl">
                {card.title}
              </h3>
              <p className="mt-3 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
                {card.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
