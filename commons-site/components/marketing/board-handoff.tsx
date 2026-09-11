import { BOARD_HANDOFF } from '@/lib/marketing'

export function MarketingBoardHandoff() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50 py-16 md:py-24" id="board-handoff">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div>
          <span className="mb-4 inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
            {BOARD_HANDOFF.eyebrow}
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-4xl">
            {BOARD_HANDOFF.headline}
          </h2>
          <p className="mt-3 mb-6 max-w-2xl text-base font-normal leading-relaxed whitespace-pre-line text-slate-600 md:text-lg">
            {BOARD_HANDOFF.support}
          </p>
          <ul className="mt-8 space-y-4">
            {BOARD_HANDOFF.points.map((point) => (
              <li key={point.title} className="card-surface">
                <h3 className="text-lg font-semibold text-slate-900">{point.title}</h3>
                <p className="mt-1.5 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-surface sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Role change</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-sm text-slate-600">Outgoing</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Treasurer · 2024 to 2025</p>
              <p className="mt-1 text-sm text-slate-600">Access closing</p>
            </div>
            <div className="flex items-center gap-3 px-1">
              <span className="h-px flex-1 bg-zinc-200" aria-hidden />
              <span className="text-xs font-semibold text-emerald-900">Seat transfers</span>
              <span className="h-px flex-1 bg-zinc-200" aria-hidden />
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm text-emerald-900">Incoming</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Treasurer · 2025 to 2026</p>
              <p className="mt-1 text-sm font-normal leading-relaxed text-slate-600">
                Inherits Drive, Canva, and Staff tools for the role
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-2 border-t border-zinc-200 pt-4">
            {['Google Workspace folders', 'Canva brand kits', 'Staff workspace queues'].map((item) => (
              <li key={item} className="flex items-center gap-2 text-base font-normal text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-900" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
