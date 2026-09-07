import { BOARD_HANDOFF } from '@/lib/marketing'

export function MarketingBoardHandoff() {
  return (
    <section className="border-y border-[var(--line)] bg-[var(--paper-deep)]" id="board-handoff">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div>
          <p className="type-eyebrow text-[var(--accent)]">{BOARD_HANDOFF.eyebrow}</p>
          <h2 className="type-section mt-2 text-[var(--ink)]">{BOARD_HANDOFF.headline}</h2>
          <p className="type-lede mt-4 whitespace-pre-line text-[var(--ink-muted)]">
            {BOARD_HANDOFF.support}
          </p>
          <ul className="mt-8 space-y-5">
            {BOARD_HANDOFF.points.map((point) => (
              <li key={point.title} className="border-t border-[var(--line)] pt-4">
                <h3 className="type-ui text-[var(--ink)]">{point.title}</h3>
                <p className="type-small mt-1.5 whitespace-pre-line text-[var(--ink-muted)]">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-6">
          <p className="type-small font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
            Role change
          </p>
          <div className="mt-5 space-y-4">
            <div className="rounded-md border border-[var(--line)] bg-[var(--paper-deep)] px-4 py-3">
              <p className="type-small text-[var(--ink-muted)]">Outgoing</p>
              <p className="type-ui mt-1 text-[var(--ink)]">Treasurer · 2024 to 2025</p>
              <p className="type-small mt-1 text-[var(--ink-muted)]">Access closing</p>
            </div>
            <div className="flex items-center gap-3 px-1">
              <span className="h-px flex-1 bg-[var(--line)]" aria-hidden />
              <span className="type-small text-[var(--accent)]">Seat transfers</span>
              <span className="h-px flex-1 bg-[var(--line)]" aria-hidden />
            </div>
            <div className="rounded-md border border-[var(--accent)]/35 bg-[var(--accent-soft)]/50 px-4 py-3">
              <p className="type-small text-[var(--accent)]">Incoming</p>
              <p className="type-ui mt-1 text-[var(--ink)]">Treasurer · 2025 to 2026</p>
              <p className="type-small mt-1 text-[var(--ink)]">
                Inherits Drive, Canva, and Staff tools for the role
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-2 border-t border-[var(--line)] pt-4">
            {['Google Workspace folders', 'Canva brand kits', 'Staff workspace queues'].map((item) => (
              <li key={item} className="type-small flex items-center gap-2 text-[var(--ink)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
