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
    <section className="bg-zinc-50 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="max-w-xl font-sans text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          What boards get done
        </h2>
        <p className="mt-3 max-w-xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-700 sm:text-lg">
          {`Four jobs that used to live in five tools.\nNow they live in one place.`}
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <li key={pillar.id} className="card-surface">
              <div className="mb-3 text-[var(--brand-primary)]">{icons[pillar.id]}</div>
              <h3 className="text-base font-semibold text-slate-900">{pillar.title}</h3>
              <p className="mt-2 text-sm font-normal leading-relaxed text-slate-700">{pillar.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
