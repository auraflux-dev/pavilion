import { AUDIENCES } from '@/lib/marketing'

export function MarketingAudienceStrip() {
  return (
    <section className="border-y border-[var(--line)] bg-[var(--paper-deep)]">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] sm:text-3xl">
          Perfect for
        </h2>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-4">
          {AUDIENCES.map((label) => (
            <li
              key={label}
              className="text-sm font-medium text-[var(--ink-muted)] before:mr-2 before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-[var(--accent)] before:align-middle before:content-['']"
            >
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
