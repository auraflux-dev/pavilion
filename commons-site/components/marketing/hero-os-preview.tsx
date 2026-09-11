'use client'

import { useState } from 'react'

type Surface = 'public' | 'family' | 'staff'

const tabs: { id: Surface; label: string }[] = [
  { id: 'public', label: 'Public site' },
  { id: 'family', label: 'Family login' },
  { id: 'staff', label: 'Staff portal' },
]

export function HeroOsPreview() {
  const [active, setActive] = useState<Surface>('family')

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white text-slate-900 shadow-xl">
      <div
        role="tablist"
        aria-label="Public site, family login, and staff portal preview"
        className="grid grid-cols-3 border-b border-zinc-200 bg-zinc-50"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`hero-tab-${tab.id}`}
              aria-controls={`hero-panel-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={`px-2 py-3 text-center text-[11px] tracking-wide transition sm:text-xs ${
                selected
                  ? 'border-b-2 border-emerald-900 bg-white font-bold text-slate-900'
                  : 'font-semibold text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`hero-panel-${active}`}
        aria-labelledby={`hero-tab-${active}`}
        className="min-h-[280px] p-4 sm:p-5"
      >
        {active === 'public' ? <PublicPreview /> : null}
        {active === 'family' ? <FamilyPreview /> : null}
        {active === 'staff' ? <StaffPreview /> : null}
      </div>
    </div>
  )
}

function BrowserChrome({ host }: { host: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
      <span className="flex gap-1" aria-hidden>
        <span className="h-2 w-2 rounded-full bg-zinc-300" />
        <span className="h-2 w-2 rounded-full bg-zinc-300" />
        <span className="h-2 w-2 rounded-full bg-zinc-300" />
      </span>
      <p className="truncate text-[11px] font-semibold text-slate-700">{host}</p>
    </div>
  )
}

function PublicPreview() {
  return (
    <div>
      <BrowserChrome host="pto.riversideelementary.org" />
      <div className="rounded-xl border border-emerald-200 bg-emerald-950 p-4 text-white">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/80">
          Your school brand
        </p>
        <p className="mt-1 font-sans text-lg font-bold tracking-tight text-white">
          Riverside Elementary PTO
        </p>
        <p className="mt-2 text-sm leading-relaxed text-emerald-50/90">
          Membership, events, and fundraising on the school identity.
          Parents never see Pavilion.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-emerald-950">
            Join the PTO
          </span>
          <span className="rounded-md border border-white/40 px-3 py-1.5 text-xs font-semibold text-white">
            Fall events
          </span>
        </div>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {['Custom domain', 'School colors', 'Donate & join'].map((label) => (
          <li
            key={label}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-[11px] font-semibold text-slate-700"
          >
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FamilyPreview() {
  return (
    <div>
      <BrowserChrome host="pto.riversideelementary.org/membership" />
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-900">
              Household
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Chen family</p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-900">
            Member active
          </span>
        </div>
        <ul className="mt-4 space-y-2">
          {[
            { title: 'Fall Festival volunteers', meta: '2 slots open' },
            { title: 'Spirit wear order', meta: 'Paid' },
            { title: 'Enrichment: Chess Club', meta: 'Registered' },
          ].map((row) => (
            <li
              key={row.title}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5"
            >
              <span className="text-sm font-medium text-slate-900">{row.title}</span>
              <span className="text-xs font-semibold text-slate-500">{row.meta}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function StaffPreview() {
  return (
    <div>
      <BrowserChrome host="pto.riversideelementary.org/staff" />
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-900">
          Staff queues
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">Today for membership chair</p>
        <ul className="mt-4 space-y-2">
          {[
            { title: 'Renewal reminders', meta: '12 pending', tone: 'open' },
            { title: 'Volunteer approvals', meta: '3 waiting', tone: 'open' },
            { title: 'Drive folders for role', meta: 'Ready', tone: 'done' },
          ].map((row) => (
            <li
              key={row.title}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5"
            >
              <span className="text-sm font-medium text-slate-900">{row.title}</span>
              <span
                className={
                  row.tone === 'done'
                    ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-900'
                    : 'rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900'
                }
              >
                {row.meta}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
