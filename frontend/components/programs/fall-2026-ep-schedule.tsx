'use client'

import {
  FALL_2026_EP_CLASSES,
  FALL_2026_EP_LOCATION,
  FALL_2026_EP_SALES,
  findProgramForFallEpClass,
  formatFall2026EpDate,
} from '@/lib/programs/fall-2026-ep'

type LinkedProgram = {
  id: string
  name: string
  dayOfWeek: string
  classTime: string
  startDate: string
  endDate: string
  instructorName: string
  fallEpClassId?: string
}

type Props = {
  variant?: 'public' | 'staff'
  /** Staff: live CMS values so this table stays in sync with Programs cards. */
  programs?: LinkedProgram[]
  canEdit?: boolean
}

export function Fall2026EpSchedule({
  variant = 'public',
  programs,
  canEdit = false,
}: Props) {
  const staffLive = variant === 'staff'
  const printHint = staffLive
    ? canEdit
      ? 'This table mirrors Programs CMS below.\nEdit a class in the Programs list.\nEvery place on this page updates together.\nRoom stays Library (principal packet).'
      : 'Share https://www.shmspto.org/programs/fall-2026 with instructors, or print this page.'
    : 'Print this page or save as PDF to share with instructors.'

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--brand-green)' }}>
            Fall 2026 · 12 sessions
          </p>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Enrichment schedule</h2>
          <p className="mt-1 text-sm text-[#5A6070] whitespace-pre-line">
            {`Library only. Two classes each night with a 15-minute break.\n${printHint}`}
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
            {FALL_2026_EP_CLASSES.map((c) => {
              const linked = findProgramForFallEpClass(c, programs ?? [])
              const day = linked?.dayOfWeek || c.dayOfWeek
              const time = linked?.classTime || c.classTime
              const first = linked?.startDate || c.dates[0]
              const last = linked?.endDate || c.dates[c.dates.length - 1]
              const displayName = linked?.name || c.name
              const instructor = linked?.instructorName?.trim() || c.vendor

              return (
                <tr key={c.id} className="border-b border-[var(--border)] last:border-0 align-top">
                  <td className="px-3 py-2 font-semibold">
                    {displayName}
                    {staffLive && canEdit && !linked ? (
                      <p className="text-[10px] font-normal text-[#5A6070] mt-0.5">
                        No CMS program linked yet
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{day}</td>
                  <td className="px-3 py-2">{time}</td>
                  <td className="px-3 py-2">{FALL_2026_EP_LOCATION}</td>
                  <td className="px-3 py-2">{instructor}</td>
                  <td className="px-3 py-2">
                    {formatFall2026EpDate(first)} → {formatFall2026EpDate(last)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-[#5A6070] whitespace-pre-line">
        {`Paid-member registration ${FALL_2026_EP_SALES.paidMembers}.\nPublic ${FALL_2026_EP_SALES.public}.\nPrincipal packet: library Tuesday and Wednesday 5:30 to 8:00 p.m. only.`}
      </p>

      {FALL_2026_EP_CLASSES.map((c) => {
        const linked = findProgramForFallEpClass(c, programs ?? [])
        const heading = linked?.name || c.name
        return (
          <div key={`${c.id}-dates`}>
            <h3 className="mb-2 text-base font-bold text-[#1A1A1A]">
              {heading} · 12 meetings
            </h3>
            <p className="mb-2 text-xs text-[#5A6070] whitespace-pre-line">
              {staffLive
                ? `Meeting nights from the principal packet (fixed).\nSkip: ${c.skips}. Oct 28 Wednesday is in session (end of quarter).`
                : `Skip: ${c.skips}. Oct 28 Wednesday is in session (end of quarter).`}
            </p>
            <ol className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3 md:grid-cols-4">
              {c.dates.map((iso, i) => (
                <li key={iso} className="rounded-md border border-[var(--border)] bg-white px-2 py-1">
                  {i + 1}. {formatFall2026EpDate(iso)}
                </li>
              ))}
            </ol>
          </div>
        )
      })}
    </div>
  )
}
