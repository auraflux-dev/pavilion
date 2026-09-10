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
    <section className="bg-zinc-50 py-16 md:py-24" id="surfaces">
      <div className="mx-auto max-w-6xl px-5">
        <div className="badge-micro mb-5">Three places</div>
        <h2 className="max-w-3xl text-2xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Public. Family. Staff.
        </h2>
        <p className="mt-4 max-w-2xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
          {`Click through the three places your community works.\nSame product. Same brand. Different jobs.`}
        </p>

        <div
          role="tablist"
          aria-label="Public, family, and staff"
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
                    ? 'border-emerald-900 bg-emerald-900 text-white shadow-sm'
                    : 'border-zinc-200/90 bg-white text-slate-900 shadow-sm hover:border-emerald-900 hover:shadow-md'
                }`}
                onClick={() => setActiveId(surface.id)}
              >
                <span className={`block text-xs ${selected ? 'opacity-80' : 'text-slate-600'}`}>
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
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
              {active.tagline}
            </p>
            <p className="mt-3 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
              {active.body}
            </p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {active.benefits.map((benefit) => (
                <li key={benefit} className="flex gap-2 text-base font-normal leading-relaxed text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-900" aria-hidden />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            {linkToProduct ? (
              <p className="mt-5">
                <Link href={active.href} className="text-sm font-semibold text-emerald-900 hover:underline">
                  {`More on ${active.title}`}
                </Link>
              </p>
            ) : null}
          </div>
          <div key={`${active.id}-frame`} className="surface-fade">
            <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-2 shadow-sm">
              <BrowserFrame
                src={active.imageSrc}
                alt={active.imageAlt}
                hostLabel={active.hostLabel}
                large
              />
            </div>
            {active.id === 'staff' ? (
              <p className="mt-3 text-base font-normal leading-relaxed text-slate-600">
                Staff home tiles cover membership, money, programs, events, messages, and role tools.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
