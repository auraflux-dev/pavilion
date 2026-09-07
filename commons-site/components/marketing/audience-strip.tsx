import { AUDIENCES } from '@/lib/marketing'

export function MarketingAudienceStrip() {
  return (
    <section className="border-y border-[var(--line)] bg-[var(--paper-deep)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-8 sm:flex-row sm:gap-6 sm:py-9">
        <p className="type-eyebrow shrink-0 text-[var(--accent)]">Built for</p>
        <p className="type-small text-center text-[var(--ink-muted)] sm:text-left">
          {AUDIENCES.join(' · ')}
        </p>
      </div>
    </section>
  )
}
