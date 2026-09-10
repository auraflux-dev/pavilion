import { BOARD_HANDOFF } from '@/lib/marketing'

export function MarketingBoardHandoff() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50 py-16 md:py-24" id="board-handoff">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div>
          <div className="mb-5 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 ring-1 ring-zinc-200">
            {BOARD_HANDOFF.eyebrow}
          </div>
          <h2 className="font-sans text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {BOARD_HANDOFF.headline}
          </h2>
          <p className="mt-4 whitespace-pre-line text-base font-normal leading-relaxed text-slate-700 sm:text-lg">
            {BOARD_HANDOFF.support}
          </p>
          <ul className="mt-8 space-y-4">
            {BOARD_HANDOFF.points.map((point) => (
              <li key={point.title} className="card-surface">
                <h3 className="text-sm font-semibold text-slate-900">{point.title}</h3>
                <p className="mt-1.5 whitespace-pre-line text-sm font-normal leading-relaxed text-slate-700">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-surface sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Role change
          </p>
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-sm text-slate-500">Outgoing</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Treasurer · 2024 to 2025</p>
              <p className="mt-1 text-sm text-slate-500">Access closing</p>
            </div>
            <div className="flex items-center gap-3 px-1">
              <span className="h-px flex-1 bg-zinc-200" aria-hidden />
              <span className="text-xs font-semibold text-[var(--brand-primary)]">Seat transfers</span>
              <span className="h-px flex-1 bg-zinc-200" aria-hidden />
            </div>
            <div className="rounded-xl border border-[var(--brand-primary)]/35 bg-[var(--brand-soft)] px-4 py-3">
              <p className="text-sm text-[var(--brand-primary)]">Incoming</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Treasurer · 2025 to 2026</p>
              <p className="mt-1 text-sm font-normal leading-relaxed text-slate-700">
                Inherits Drive, Canva, and Staff tools for the role
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-2 border-t border-zinc-200 pt-4">
            {['Google Workspace folders', 'Canva brand kits', 'Staff workspace queues'].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-normal text-slate-700">
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
