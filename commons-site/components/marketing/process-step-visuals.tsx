import { DemoBookingLink } from '@/components/demo-booking-link'

/** Minimal product UI previews for Process steps. No emojis. */

export function ProcessTourCard() {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
      <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-white px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-zinc-300" aria-hidden />
        <span className="h-2 w-2 rounded-full bg-zinc-300" aria-hidden />
        <span className="h-2 w-2 rounded-full bg-zinc-300" aria-hidden />
        <span className="ml-2 flex-1 truncate rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] text-zinc-500">
          Book a live walkthrough
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="h-3 w-2/5 max-w-[40%] rounded bg-zinc-200" />
        <div className="h-2.5 w-4/5 max-w-[80%] rounded bg-zinc-200/80" />
        <div className="h-2.5 w-3/5 max-w-[60%] rounded bg-zinc-200/80" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="h-14 rounded-lg bg-zinc-200/70" />
          <div className="h-14 rounded-lg bg-zinc-200/70" />
          <div className="h-14 rounded-lg bg-zinc-200/70" />
        </div>
        <div className="flex justify-center pt-2">
          <DemoBookingLink className="inline-flex rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
            Book a demo
          </DemoBookingLink>
        </div>
      </div>
    </div>
  )
}

export function ProcessBrandCard() {
  return (
    <div className="mt-5 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Logo
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-semibold text-slate-900">School brand</p>
          <div className="flex items-center gap-2">
            <span
              className="h-6 w-6 rounded-full border border-zinc-200"
              style={{ background: '#065F46' }}
              title="Primary #065F46"
              aria-label="Primary color #065F46"
            />
            <span
              className="h-6 w-6 rounded-full border border-zinc-200"
              style={{ background: '#F4F4F5' }}
              title="Secondary #F4F4F5"
              aria-label="Secondary color #F4F4F5"
            />
            <span className="text-[11px] text-slate-500">#065F46 · #F4F4F5</span>
          </div>
        </div>
      </div>
      <label className="mt-4 block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Custom domain
        </span>
        <div className="mt-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-slate-700">
          yourpto.org
        </div>
      </label>
    </div>
  )
}

export function ProcessPruneCard() {
  const rows = [
    { label: 'Store & Memberships', on: true },
    { label: 'Volunteer Rosters', on: true },
    { label: 'Unused Legacy Features', on: false },
  ] as const
  return (
    <div className="mt-5 space-y-2 rounded-xl border border-zinc-200 bg-white p-4">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5"
        >
          <span className="text-sm font-medium text-slate-800">{row.label}</span>
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full ${
              row.on ? 'bg-emerald-800' : 'bg-zinc-300'
            }`}
            aria-label={`${row.label}: ${row.on ? 'ON' : 'OFF'}`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
                row.on ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </span>
        </div>
      ))}
    </div>
  )
}

export function ProcessConnectCard() {
  return (
    <div className="mt-5 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Square Account Connected</p>
          <p className="mt-1 text-xs text-slate-500">Parent payouts stay on your school Square</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" aria-hidden />
          Verified
        </span>
      </div>
      <div className="mt-3 inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
        0% Pavilion Fee
      </div>
    </div>
  )
}

export const PROCESS_STEP_VISUALS = [
  ProcessTourCard,
  ProcessBrandCard,
  ProcessPruneCard,
  ProcessConnectCard,
] as const
