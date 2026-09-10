import { BOARD_HANDOFF } from '@/lib/marketing'

export function MarketingBoardHandoff() {
  return (
    <section className="border-y border-[var(--line)] bg-[var(--brand-mist)] py-16 md:py-24" id="board-handoff">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div>
          <div className="mb-5 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] ring-1 ring-[var(--brand-line)]">
            {BOARD_HANDOFF.eyebrow}
          </div>
          <h2 className="font-sans text-3xl font-bold tracking-tight text-[var(--brand-text)] sm:text-4xl">
            {BOARD_HANDOFF.headline}
          </h2>
          <p className="mt-4 whitespace-pre-line text-base font-normal leading-relaxed text-[var(--ink-muted)] sm:text-lg">
            {BOARD_HANDOFF.support}
          </p>
          <ul className="mt-8 space-y-4">
            {BOARD_HANDOFF.points.map((point) => (
              <li key={point.title} className="card-surface">
                <h3 className="text-sm font-semibold text-[var(--brand-text)]">{point.title}</h3>
                <p className="mt-1.5 whitespace-pre-line text-sm font-normal leading-relaxed text-[var(--ink-muted)]">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-surface sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
            Role change
          </p>
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--brand-mist)] px-4 py-3">
              <p className="text-sm text-[var(--ink-muted)]">Outgoing</p>
              <p className="mt-1 text-sm font-semibold text-[var(--brand-text)]">Treasurer · 2024 to 2025</p>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">Access closing</p>
            </div>
            <div className="flex items-center gap-3 px-1">
              <span className="h-px flex-1 bg-[var(--brand-line)]" aria-hidden />
              <span className="text-xs font-semibold text-[var(--brand-primary)]">Seat transfers</span>
              <span className="h-px flex-1 bg-[var(--brand-line)]" aria-hidden />
            </div>
            <div className="rounded-xl border border-[var(--brand-primary)]/35 bg-[var(--brand-soft)] px-4 py-3">
              <p className="text-sm text-[var(--brand-primary)]">Incoming</p>
              <p className="mt-1 text-sm font-semibold text-[var(--brand-text)]">Treasurer · 2025 to 2026</p>
              <p className="mt-1 text-sm font-normal leading-relaxed text-[var(--ink-muted)]">
                Inherits Drive, Canva, and Staff tools for the role
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-2 border-t border-[var(--line)] pt-4">
            {['Google Workspace folders', 'Canva brand kits', 'Staff workspace queues'].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-normal text-[var(--ink-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
