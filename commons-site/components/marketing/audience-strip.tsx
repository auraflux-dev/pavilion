import { AUDIENCES } from '@/lib/marketing'

export function MarketingAudienceStrip() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-8 sm:flex-row sm:gap-6 sm:py-9">
        <div className="badge-micro shrink-0">Built for</div>
        <p className="text-center text-base font-normal leading-relaxed text-slate-600 sm:text-left">
          {AUDIENCES.join(' · ')}
        </p>
      </div>
    </section>
  )
}
