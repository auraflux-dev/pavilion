'use client'

import {
  FALL_2026_EP_CLASSES,
  FALL_2026_EP_LOCATION,
  FALL_2026_EP_SALES,
  formatFall2026EpDate,
} from '@/lib/programs/fall-2026-ep'

export function Fall2026EpSchedule({ variant = 'public' }: { variant?: 'public' | 'staff' }) {
  const printHint =
    variant === 'staff'
      ? 'Share https://www.shmspto.org/programs/fall-2026 with instructors, or print this page.'
      : 'Print this page or save as PDF to share with instructors. Registration is not open yet.'

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--brand-green)' }}>
            Fall 2026 · 12 sessions
          </p>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Enrichment schedule</h2>
          <p className="mt-1 text-sm text-[#5A6070]">
            Library only. Two classes each night with a 15-minute break. {printHint}
          </p>
        </div>
        {variant === 'public' ? (
          <button
            type="button"
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold print:hidden"
            onClick={() => window.print()}
          >
            Print / save PDF
          </button>
        ) : (
          <a
            href="/programs/fall-2026"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold underline print:hidden"
            style={{ color: 'var(--brand-green)' }}
          >
            Open share page
          </a>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--brand-warm)]">
            <tr>
              <th className="px-3 py-2 font-semibold">Class</th>
              <th className="px-3 py-2 font-semibold">Night</th>
              <th className="px-3 py-2 font-semibold">Time</th>
              <th className="px-3 py-2 font-semibold">Room</th>
              <th className="px-3 py-2 font-semibold">Instructor</th>
              <th className="px-3 py-2 font-semibold">First / last</th>
            </tr>
          </thead>
          <tbody>
            {FALL_2026_EP_CLASSES.map((c) => (
              <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-3 py-2 font-semibold">{c.name}</td>
                <td className="px-3 py-2">{c.dayOfWeek}</td>
                <td className="px-3 py-2">{c.classTime}</td>
                <td className="px-3 py-2">{FALL_2026_EP_LOCATION}</td>
                <td className="px-3 py-2">{c.vendor}</td>
                <td className="px-3 py-2">
                  {formatFall2026EpDate(c.dates[0])} → {formatFall2026EpDate(c.dates[c.dates.length - 1])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-[#5A6070]">
        Paid-member registration {FALL_2026_EP_SALES.paidMembers}. Public {FALL_2026_EP_SALES.public}. Principal
        packet: library Tuesday and Wednesday 5:30–8:00 p.m. only.
      </p>

      {FALL_2026_EP_CLASSES.map((c) => (
        <div key={`${c.id}-dates`}>
          <h3 className="mb-2 text-base font-bold text-[#1A1A1A]">
            {c.name} · 12 meetings
          </h3>
          <p className="mb-2 text-xs text-[#5A6070]">Skip: {c.skips}. Oct 28 Wednesday is in session (end of quarter).</p>
          <ol className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3 md:grid-cols-4">
            {c.dates.map((iso, i) => (
              <li key={iso} className="rounded-md border border-[var(--border)] bg-white px-2 py-1">
                {i + 1}. {formatFall2026EpDate(iso)}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}
