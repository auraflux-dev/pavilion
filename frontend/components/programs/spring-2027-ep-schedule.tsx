'use client'

import {
  formatSpring2027EpDate,
  SPRING_2027_EP_PLACEHOLDER,
  type Spring2027ScheduleRow,
} from '@/lib/programs/spring-2027-ep'

export function Spring2027EpSchedule({
  rows,
  footnote,
}: {
  rows: Spring2027ScheduleRow[]
  footnote?: string
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--brand-green)' }}
          >
            Enrichment schedule
          </p>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Spring 2027 class nights</h2>
          <p className="mt-1 text-sm text-[#5A6070] whitespace-pre-line">
            {SPRING_2027_EP_PLACEHOLDER
              ? 'Placeholder dates for staging review.\nConfirm against LCPS calendar and vendor packets before public unlock.'
              : 'Print this page or save as PDF to share with instructors.'}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold print:hidden"
          onClick={() => window.print()}
        >
          Print / save PDF
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[#5A6070]">No Spring classes in the packet yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
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
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--border)] last:border-0 align-top"
                >
                  <td className="px-3 py-2 font-semibold">{row.name}</td>
                  <td className="px-3 py-2">{row.dayOfWeek}</td>
                  <td className="px-3 py-2">{row.classTime}</td>
                  <td className="px-3 py-2">{row.location}</td>
                  <td className="px-3 py-2">{row.instructorName}</td>
                  <td className="px-3 py-2">
                    {formatSpring2027EpDate(row.startDate)} to{' '}
                    {formatSpring2027EpDate(row.endDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {footnote ? (
        <p className="text-sm text-[#5A6070] whitespace-pre-line">{footnote}</p>
      ) : null}

      {rows.map((row) => {
        const dates = String(row.meetingDates ?? '')
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
        return (
          <div key={`${row.id}-dates`}>
            <h3 className="mb-2 text-base font-bold text-[#1A1A1A]">
              {row.name}
              {dates.length ? ` · ${dates.length} meetings` : ''}
            </h3>
            {row.skipsNote ? (
              <p className="mb-2 text-xs text-[#5A6070]">Skip: {row.skipsNote}</p>
            ) : null}
            {row.sessionNote ? (
              <p className="mb-2 text-xs text-[#5A6070] whitespace-pre-line">{row.sessionNote}</p>
            ) : null}
            {dates.length > 0 ? (
              <ol className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3 md:grid-cols-4">
                {dates.map((iso, i) => (
                  <li
                    key={`${row.id}-${i}`}
                    className="rounded-md border border-[var(--border)] bg-white px-2 py-1"
                  >
                    {i + 1}. {formatSpring2027EpDate(iso)}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
