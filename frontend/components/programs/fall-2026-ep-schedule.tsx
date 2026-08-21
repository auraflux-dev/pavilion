'use client'

import {
  formatFall2026EpDate,
  resolveMeetingDates,
  serializeMeetingDates,
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
  location?: string
  meetingDates?: string
  skipsNote?: string
}

type Props = {
  variant?: 'public' | 'staff'
  /** CMS Programs rows (public + staff). Nothing on this page is packet-hardcoded. */
  programs?: LinkedProgram[]
  canEdit?: boolean
  onProgramChange?: (id: string, patch: Record<string, unknown>) => void
  onProgramSave?: (id: string, patch: Record<string, unknown>) => void
  onAddProgram?: () => void
  onRemoveProgram?: (id: string, name: string) => void
  /** Optional footnote from CMS / staff (registration windows). */
  footnote?: string
}

export function Fall2026EpSchedule({
  variant = 'public',
  programs = [],
  canEdit = false,
  onProgramChange,
  onProgramSave,
  onAddProgram,
  onRemoveProgram,
  footnote,
}: Props) {
  const staffEdit = variant === 'staff' && canEdit && Boolean(onProgramChange && onProgramSave)
  const rows = programs
  const printHint = staffEdit
    ? 'Every cell below is editable.\nAdd or remove classes and meeting dates here.\nClick out of a field to save.'
    : variant === 'staff'
      ? 'Share https://www.shmspto.org/programs/fall-2026 with instructors, or print this page.'
      : 'Print this page or save as PDF to share with instructors.'

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--brand-green)' }}>
            Enrichment schedule
          </p>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Class nights</h2>
          <p className="mt-1 text-sm text-[#5A6070] whitespace-pre-line">{printHint}</p>
          {staffEdit && onAddProgram ? (
            <button
              type="button"
              className="mt-2 text-sm font-semibold underline"
              style={{ color: 'var(--brand-green)' }}
              onClick={() => onAddProgram()}
            >
              Add class row
            </button>
          ) : null}
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

      {rows.length === 0 ? (
        <p className="text-sm text-[#5A6070]">
          No programs to show yet. Add or open Fall classes under Staff → Programs.
        </p>
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
                {staffEdit ? <th className="px-3 py-2 font-semibold print:hidden"> </th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const dates = resolveMeetingDates(row.meetingDates, [])
                const first = row.startDate || dates[0] || ''
                const last = row.endDate || dates[dates.length - 1] || ''
                const day = row.dayOfWeek || ''
                const time = row.classTime || ''
                const room = row.location?.trim() || ''
                const instructor = row.instructorName?.trim() || ''

                return (
                  <tr key={row.id} className="border-b border-[var(--border)] last:border-0 align-top">
                    <td className="px-3 py-2 font-semibold">
                      {staffEdit ? (
                        <input
                          value={row.name}
                          aria-label={`${row.name} class name`}
                          className="w-full min-w-[8rem] border border-[var(--border)] rounded px-2 py-1 text-sm font-semibold"
                          onChange={(e) => onProgramChange?.(row.id, { name: e.target.value })}
                          onBlur={(e) => {
                            const next = e.target.value.trim()
                            if (next) onProgramSave?.(row.id, { name: next })
                          }}
                        />
                      ) : (
                        row.name
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {staffEdit ? (
                        <input
                          value={day}
                          aria-label={`${row.name} night`}
                          className="w-full min-w-[5rem] border border-[var(--border)] rounded px-2 py-1 text-sm"
                          onChange={(e) => onProgramChange?.(row.id, { dayOfWeek: e.target.value })}
                          onBlur={(e) => onProgramSave?.(row.id, { dayOfWeek: e.target.value })}
                        />
                      ) : (
                        day
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {staffEdit ? (
                        <input
                          value={time}
                          aria-label={`${row.name} time`}
                          className="w-full min-w-[7rem] border border-[var(--border)] rounded px-2 py-1 text-sm"
                          onChange={(e) => onProgramChange?.(row.id, { classTime: e.target.value })}
                          onBlur={(e) => onProgramSave?.(row.id, { classTime: e.target.value })}
                        />
                      ) : (
                        time
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {staffEdit ? (
                        <input
                          value={room}
                          aria-label={`${row.name} room`}
                          className="w-full min-w-[6rem] border border-[var(--border)] rounded px-2 py-1 text-sm"
                          onChange={(e) => onProgramChange?.(row.id, { location: e.target.value })}
                          onBlur={(e) => onProgramSave?.(row.id, { location: e.target.value })}
                        />
                      ) : (
                        room
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {staffEdit ? (
                        <input
                          value={instructor}
                          aria-label={`${row.name} instructor`}
                          className="w-full min-w-[7rem] border border-[var(--border)] rounded px-2 py-1 text-sm"
                          onChange={(e) =>
                            onProgramChange?.(row.id, { instructorName: e.target.value })
                          }
                          onBlur={(e) =>
                            onProgramSave?.(row.id, { instructorName: e.target.value })
                          }
                        />
                      ) : (
                        instructor
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {staffEdit ? (
                        <div className="flex flex-col gap-1">
                          <input
                            type="date"
                            value={first.slice(0, 10)}
                            aria-label={`${row.name} first date`}
                            className="border border-[var(--border)] rounded px-2 py-1 text-xs"
                            onChange={(e) => {
                              onProgramChange?.(row.id, { startDate: e.target.value })
                              onProgramSave?.(row.id, { startDate: e.target.value })
                            }}
                          />
                          <input
                            type="date"
                            value={last.slice(0, 10)}
                            aria-label={`${row.name} last date`}
                            className="border border-[var(--border)] rounded px-2 py-1 text-xs"
                            onChange={(e) => {
                              onProgramChange?.(row.id, { endDate: e.target.value })
                              onProgramSave?.(row.id, { endDate: e.target.value })
                            }}
                          />
                        </div>
                      ) : first && last ? (
                        <>
                          {formatFall2026EpDate(first)} → {formatFall2026EpDate(last)}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    {staffEdit ? (
                      <td className="px-3 py-2">
                        {onRemoveProgram ? (
                          <button
                            type="button"
                            className="text-xs font-semibold underline text-red-700"
                            onClick={() => onRemoveProgram(row.id, row.name)}
                          >
                            Remove
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {footnote ? (
        <p className="text-sm text-[#5A6070] whitespace-pre-line">{footnote}</p>
      ) : null}

      {rows.map((row) => {
        const dates = resolveMeetingDates(row.meetingDates, [])
        const skips = row.skipsNote?.trim() || ''
        return (
          <div key={`${row.id}-dates`}>
            <h3 className="mb-2 text-base font-bold text-[#1A1A1A]">
              {row.name}
              {dates.length ? ` · ${dates.length} meetings` : ''}
            </h3>
            {staffEdit ? (
              <input
                value={skips}
                aria-label={`${row.name} skip note`}
                placeholder="Skip / holiday note"
                className="mb-2 w-full border border-[var(--border)] rounded px-2 py-1 text-xs"
                onChange={(e) => onProgramChange?.(row.id, { skipsNote: e.target.value })}
                onBlur={(e) => onProgramSave?.(row.id, { skipsNote: e.target.value })}
              />
            ) : skips ? (
              <p className="mb-2 text-xs text-[#5A6070]">Skip: {skips}</p>
            ) : null}
            {dates.length > 0 ? (
              <ol className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3 md:grid-cols-4">
                {dates.map((iso, i) => (
                  <li
                    key={`${row.id}-${i}`}
                    className="rounded-md border border-[var(--border)] bg-white px-2 py-1"
                  >
                    {staffEdit ? (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-[#5A6070]">{i + 1}.</span>
                        <input
                          type="date"
                          value={iso.slice(0, 10)}
                          aria-label={`${row.name} meeting ${i + 1}`}
                          className="flex-1 border border-[var(--border)] rounded px-1 py-0.5 text-xs"
                          onChange={(e) => {
                            const next = [...dates]
                            next[i] = e.target.value
                            const patch = {
                              meetingDates: serializeMeetingDates(next),
                              startDate: next[0],
                              endDate: next[next.length - 1],
                            }
                            onProgramChange?.(row.id, patch)
                            onProgramSave?.(row.id, patch)
                          }}
                        />
                        <button
                          type="button"
                          className="text-red-700 underline shrink-0"
                          aria-label={`Remove meeting ${i + 1}`}
                          onClick={() => {
                            const next = dates.filter((_, idx) => idx !== i)
                            const patch = {
                              meetingDates: serializeMeetingDates(next),
                              startDate: next[0] || '',
                              endDate: next[next.length - 1] || '',
                              durationWeeks: next.length,
                            }
                            onProgramChange?.(row.id, patch)
                            onProgramSave?.(row.id, patch)
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <>
                        {i + 1}. {formatFall2026EpDate(iso)}
                      </>
                    )}
                  </li>
                ))}
              </ol>
            ) : null}
            {staffEdit ? (
              <button
                type="button"
                className="mt-2 text-xs font-semibold underline"
                style={{ color: 'var(--brand-green)' }}
                onClick={() => {
                  const last = dates[dates.length - 1]
                  const nextDate = last
                    ? (() => {
                        const d = new Date(`${last}T12:00:00`)
                        d.setDate(d.getDate() + 7)
                        return d.toISOString().slice(0, 10)
                      })()
                    : row.startDate || '2026-09-15'
                  const next = [...dates, nextDate]
                  const patch = {
                    meetingDates: serializeMeetingDates(next),
                    startDate: next[0],
                    endDate: next[next.length - 1],
                    durationWeeks: next.length,
                  }
                  onProgramChange?.(row.id, patch)
                  onProgramSave?.(row.id, patch)
                }}
              >
                Add meeting date
              </button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
