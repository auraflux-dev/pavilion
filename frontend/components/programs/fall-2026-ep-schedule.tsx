'use client'

import {
  FALL_2026_EP_CLASSES,
  FALL_2026_EP_LOCATION,
  FALL_2026_EP_SALES,
  findProgramForFallEpClass,
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
  programs?: LinkedProgram[]
  canEdit?: boolean
  /** Local React state only (every keystroke). */
  onProgramChange?: (id: string, patch: Record<string, unknown>) => void
  /** Persist to CMS (blur / date pick). */
  onProgramSave?: (id: string, patch: Record<string, unknown>) => void
}

export function Fall2026EpSchedule({
  variant = 'public',
  programs,
  canEdit = false,
  onProgramChange,
  onProgramSave,
}: Props) {
  const staffEdit = variant === 'staff' && canEdit && Boolean(onProgramChange && onProgramSave)
  const printHint = staffEdit
    ? 'Every cell below is editable.\nClick out of a field to save.\nChanges update the Programs list on this page too.'
    : variant === 'staff'
      ? 'Share https://www.shmspto.org/programs/fall-2026 with instructors, or print this page.'
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
            {`Two classes each night with a 15-minute break.\n${printHint}`}
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
            {FALL_2026_EP_CLASSES.map((c) => {
              const linked = findProgramForFallEpClass(c, programs ?? [])
              const editable = Boolean(staffEdit && linked)
              const day = linked?.dayOfWeek || c.dayOfWeek
              const time = linked?.classTime || c.classTime
              const dates = resolveMeetingDates(linked?.meetingDates, c.dates)
              const first = linked?.startDate || dates[0] || c.dates[0]
              const last = linked?.endDate || dates[dates.length - 1] || c.dates[c.dates.length - 1]
              const displayName = linked?.name || c.name
              const instructor = linked?.instructorName?.trim() || c.vendor
              const room = linked?.location?.trim() || FALL_2026_EP_LOCATION

              return (
                <tr key={c.id} className="border-b border-[var(--border)] last:border-0 align-top">
                  <td className="px-3 py-2 font-semibold">
                    {editable && linked ? (
                      <input
                        value={displayName}
                        aria-label={`${c.name} class name`}
                        className="w-full min-w-[8rem] border border-[var(--border)] rounded px-2 py-1 text-sm font-semibold"
                        onChange={(e) => onProgramChange?.(linked.id, { name: e.target.value })}
                        onBlur={(e) => {
                          const next = e.target.value.trim()
                          if (next) onProgramSave?.(linked.id, { name: next })
                        }}
                      />
                    ) : (
                      displayName
                    )}
                    {staffEdit && !linked ? (
                      <p className="text-[10px] font-normal text-[#5A6070] mt-0.5">
                        No CMS program linked yet
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {editable && linked ? (
                      <input
                        value={day}
                        aria-label={`${c.name} night`}
                        className="w-full min-w-[5rem] border border-[var(--border)] rounded px-2 py-1 text-sm"
                        onChange={(e) => onProgramChange?.(linked.id, { dayOfWeek: e.target.value })}
                        onBlur={(e) => onProgramSave?.(linked.id, { dayOfWeek: e.target.value })}
                      />
                    ) : (
                      day
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editable && linked ? (
                      <input
                        value={time}
                        aria-label={`${c.name} time`}
                        className="w-full min-w-[7rem] border border-[var(--border)] rounded px-2 py-1 text-sm"
                        onChange={(e) => onProgramChange?.(linked.id, { classTime: e.target.value })}
                        onBlur={(e) => onProgramSave?.(linked.id, { classTime: e.target.value })}
                      />
                    ) : (
                      time
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editable && linked ? (
                      <input
                        value={room}
                        aria-label={`${c.name} room`}
                        className="w-full min-w-[6rem] border border-[var(--border)] rounded px-2 py-1 text-sm"
                        onChange={(e) => onProgramChange?.(linked.id, { location: e.target.value })}
                        onBlur={(e) => onProgramSave?.(linked.id, { location: e.target.value })}
                      />
                    ) : (
                      room
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editable && linked ? (
                      <input
                        value={instructor}
                        aria-label={`${c.name} instructor`}
                        className="w-full min-w-[7rem] border border-[var(--border)] rounded px-2 py-1 text-sm"
                        onChange={(e) =>
                          onProgramChange?.(linked.id, { instructorName: e.target.value })
                        }
                        onBlur={(e) =>
                          onProgramSave?.(linked.id, { instructorName: e.target.value })
                        }
                      />
                    ) : (
                      instructor
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editable && linked ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="date"
                          value={first.slice(0, 10)}
                          aria-label={`${c.name} first date`}
                          className="border border-[var(--border)] rounded px-2 py-1 text-xs"
                          onChange={(e) => {
                            onProgramChange?.(linked.id, { startDate: e.target.value })
                            onProgramSave?.(linked.id, { startDate: e.target.value })
                          }}
                        />
                        <input
                          type="date"
                          value={last.slice(0, 10)}
                          aria-label={`${c.name} last date`}
                          className="border border-[var(--border)] rounded px-2 py-1 text-xs"
                          onChange={(e) => {
                            onProgramChange?.(linked.id, { endDate: e.target.value })
                            onProgramSave?.(linked.id, { endDate: e.target.value })
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        {formatFall2026EpDate(first)} → {formatFall2026EpDate(last)}
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-[#5A6070] whitespace-pre-line">
        {`Paid-member registration ${FALL_2026_EP_SALES.paidMembers}.\nPublic ${FALL_2026_EP_SALES.public}.`}
      </p>

      {FALL_2026_EP_CLASSES.map((c) => {
        const linked = findProgramForFallEpClass(c, programs ?? [])
        const heading = linked?.name || c.name
        const dates = resolveMeetingDates(linked?.meetingDates, c.dates)
        const skips = linked?.skipsNote?.trim() || c.skips
        const editable = Boolean(staffEdit && linked)

        return (
          <div key={`${c.id}-dates`}>
            <h3 className="mb-2 text-base font-bold text-[#1A1A1A]">
              {heading} · {dates.length} meetings
            </h3>
            {editable && linked ? (
              <input
                value={skips}
                aria-label={`${heading} skip note`}
                placeholder="Skip / holiday note"
                className="mb-2 w-full border border-[var(--border)] rounded px-2 py-1 text-xs"
                onChange={(e) => onProgramChange?.(linked.id, { skipsNote: e.target.value })}
                onBlur={(e) => onProgramSave?.(linked.id, { skipsNote: e.target.value })}
              />
            ) : (
              <p className="mb-2 text-xs text-[#5A6070]">Skip: {skips}</p>
            )}
            <ol className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3 md:grid-cols-4">
              {dates.map((iso, i) => (
                <li key={`${c.id}-${i}`} className="rounded-md border border-[var(--border)] bg-white px-2 py-1">
                  {editable && linked ? (
                    <label className="flex items-center gap-1 text-xs">
                      <span className="text-[#5A6070]">{i + 1}.</span>
                      <input
                        type="date"
                        value={iso.slice(0, 10)}
                        aria-label={`${heading} meeting ${i + 1}`}
                        className="flex-1 border border-[var(--border)] rounded px-1 py-0.5 text-xs"
                        onChange={(e) => {
                          const next = [...dates]
                          next[i] = e.target.value
                          const patch = {
                            meetingDates: serializeMeetingDates(next),
                            startDate: next[0],
                            endDate: next[next.length - 1],
                          }
                          onProgramChange?.(linked.id, patch)
                          onProgramSave?.(linked.id, patch)
                        }}
                      />
                    </label>
                  ) : (
                    <>
                      {i + 1}. {formatFall2026EpDate(iso)}
                    </>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )
      })}
    </div>
  )
}
