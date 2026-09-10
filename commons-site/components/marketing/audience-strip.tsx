import { AUDIENCES } from '@/lib/marketing'

export function MarketingAudienceStrip() {
  return (
    <section className="border-y border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-8 sm:flex-row sm:gap-6 sm:py-9">
        <div className="shrink-0 rounded-full bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--brand-primary)] ring-1 ring-zinc-200">
          Built for
        </div>
        <p className="text-center text-sm font-normal leading-relaxed text-slate-700 sm:text-left">
          {AUDIENCES.join(' · ')}
        </p>
      </div>
    </section>
  )
}
