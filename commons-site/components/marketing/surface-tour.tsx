'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SURFACES } from '@/lib/marketing'
import { BrowserFrame } from '@/components/marketing/browser-frame'

type SurfaceId = (typeof SURFACES)[number]['id']

type SurfaceTourProps = {
  linkToProduct?: boolean
}

export function MarketingSurfaceTour({ linkToProduct = false }: SurfaceTourProps) {
  const [activeId, setActiveId] = useState<SurfaceId>('public')
  const active = SURFACES.find((s) => s.id === activeId) ?? SURFACES[0]

  return (
    <section className="bg-[var(--paper)] py-16 md:py-24" id="surfaces">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-5 inline-block rounded-full bg-[var(--brand-mist)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] ring-1 ring-[var(--brand-line)]">
          Three surfaces
        </div>
        <h2 className="max-w-3xl font-sans text-3xl font-bold tracking-tight text-[var(--brand-text)] sm:text-4xl">
          Public. Family. Staff.
        </h2>
        <p className="mt-4 max-w-2xl whitespace-pre-line text-base font-normal leading-relaxed text-[var(--ink-muted)] sm:text-lg">
          {`Click through the three places your community works.\nSame product. Same brand. Different jobs.`}
        </p>

        <div
          role="tablist"
          aria-label="Product surfaces"
          className="relative z-20 mt-10 flex flex-col gap-2 sm:flex-row sm:flex-wrap"
        >
          {SURFACES.map((surface, index) => {
            const selected = surface.id === activeId
            return (
              <button
                key={surface.id}
                type="button"
                role="tab"
                aria-selected={selected}
                id={`surface-tab-${surface.id}`}
                aria-controls={`surface-panel-${surface.id}`}
                className={`relative z-20 cursor-pointer rounded-2xl border px-4 py-3 text-left transition sm:min-w-[10.5rem] sm:flex-1 ${
                  selected
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-sm'
                    : 'border-[var(--brand-line)]/90 bg-white text-[var(--brand-text)] shadow-sm hover:border-[var(--brand-primary)] hover:shadow-md'
                }`}
                onClick={() => setActiveId(surface.id)}
              >
                <span className={`block text-xs ${selected ? 'opacity-80' : 'text-[var(--ink-muted)]'}`}>
                  {`${index + 1}.`}
                </span>
                <span className="mt-0.5 block text-sm font-semibold">{surface.title}</span>
              </button>
            )
          })}
        </div>

        <div
          role="tabpanel"
          id={`surface-panel-${active.id}`}
          aria-labelledby={`surface-tab-${active.id}`}
          className="relative z-0 mt-8 grid items-start gap-8 lg:grid-cols-2 lg:gap-12"
        >
          <div key={`${active.id}-copy`} className="card-surface surface-fade">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
              {active.tagline}
            </p>
            <p className="mt-3 whitespace-pre-line text-base font-normal leading-relaxed text-[var(--ink-muted)]">
              {active.body}
            </p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {active.benefits.map((benefit) => (
                <li key={benefit} className="flex gap-2 text-sm font-normal leading-relaxed text-[var(--ink-muted)]">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-primary)]"
                    aria-hidden
                  />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            {linkToProduct ? (
              <p className="mt-5">
                <Link
                  href={active.href}
                  className="text-sm font-semibold text-[var(--brand-primary)] hover:underline"
                >
                  {`More on ${active.title}`}
                </Link>
              </p>
            ) : null}
          </div>
          <div key={`${active.id}-frame`} className="surface-fade">
            <BrowserFrame
              src={active.imageSrc}
              alt={active.imageAlt}
              hostLabel={active.hostLabel}
              large
            />
            {active.id === 'staff' ? (
              <p className="mt-3 text-sm font-normal leading-relaxed text-[var(--ink-muted)]">
                Staff home tiles cover membership, money, programs, events, messages, and role tools.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
