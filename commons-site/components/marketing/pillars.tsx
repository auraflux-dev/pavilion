import { PILLARS } from '@/lib/marketing'
import type { ReactNode } from 'react'

const icons: Record<(typeof PILLARS)[number]['id'], ReactNode> = {
  engage: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="9" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.5" />
      <path d="M3.5 19c.8-3 2.8-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
      <path d="M14 14.2c1.6-.4 3.2.2 4.2 1.8.4.6.7 1.3.8 2" />
    </svg>
  ),
  simplify: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  ),
  sell: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M6 7h13l-1.2 8.2a2 2 0 0 1-2 1.7H9.1a2 2 0 0 1-2-1.6L5.5 4.5H3" />
      <circle cx="9.5" cy="19.5" r="1.2" />
      <circle cx="16.5" cy="19.5" r="1.2" />
    </svg>
  ),
  streamline: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M5 19V10M10 19V5M15 19v-7M20 19V8" />
    </svg>
  ),
}

export function MarketingPillars() {
  return (
    <section className="border-b border-[var(--line)] bg-[var(--paper)]">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Built for today
        </p>
        <h2 className="mt-2 max-w-xl font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] sm:text-4xl">
          Flexible for tomorrow
        </h2>
        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, i) => (
            <li
              key={pillar.id}
              className="motion-stagger border-t border-[var(--line)] pt-5"
              style={{ animationDelay: `${120 + i * 80}ms` }}
            >
              <div className="mb-3 text-[var(--accent)]">{icons[pillar.id]}</div>
              <h3 className="text-lg font-semibold text-[var(--ink)]">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">{pillar.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
