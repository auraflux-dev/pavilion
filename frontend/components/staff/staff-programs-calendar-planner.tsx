'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  StaffMonthCalendar,
  type MonthCalendarEvent,
  type MonthCalendarTone,
} from '@/components/staff/staff-month-calendar'
import {
  holidayTitlesOnDate,
  type StaffCalendarSource,
  type StaffCalendarSourceTone,
} from '@/lib/programs/calendar-sources'
import { resolveMeetingDates } from '@/lib/programs/fall-2026-ep'
import { spring2027PacketScheduleRows } from '@/lib/programs/spring-2027-ep'

type ProgramLike = {
  id: string
  name: string
  meetingDates: string
  dayOfWeek?: string
}

type Props = {
  programs: ProgramLike[]
}

function toneToMonth(tone: StaffCalendarSourceTone): MonthCalendarTone {
  if (tone === 'amber' || tone === 'blue' || tone === 'rose') return tone
  return 'slate'
}

export function StaffProgramsCalendarPlanner({ programs }: Props) {
  const [sources, setSources] = useState<StaffCalendarSource[]>([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [month, setMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showSpringPacket, setShowSpringPacket] = useState(true)
  const [name, setName] = useState('LCPS school calendar')
  const [sourceUrl, setSourceUrl] = useState('')
  const [icsText, setIcsText] = useState('')
  const [addMode, setAddMode] = useState<'url' | 'paste'>('url')

  const load = useCallback(async () => {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/programs/calendar-sources')
      const d = (await r.json()) as { sources?: StaffCalendarSource[]; error?: string }
      if (!r.ok) throw new Error(d.error ?? 'Could not load calendars')
      setSources(d.sources ?? [])
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load calendars')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const epEvents = useMemo(() => {
    const out: MonthCalendarEvent[] = []
    for (const p of programs) {
      const dates = resolveMeetingDates(p.meetingDates, [])
      for (const date of dates) {
        out.push({
          id: `ep-${p.id}-${date}`,
          date,
          title: p.name,
          subtitle: p.dayOfWeek || 'EP night',
          tone: 'green',
        })
      }
    }
    if (showSpringPacket) {
      for (const row of spring2027PacketScheduleRows()) {
        const dates = String(row.meetingDates)
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
        for (const date of dates) {
          out.push({
            id: `spring-packet-${row.id}-${date}`,
            date,
            title: `Spring · ${row.name}`,
            subtitle: 'Placeholder packet',
            tone: 'blue',
          })
        }
      }
    }
    return out
  }, [programs, showSpringPacket])

  const sourceEvents = useMemo(() => {
    const out: MonthCalendarEvent[] = []
    for (const src of sources) {
      if (!src.active) continue
      for (const ev of src.events) {
        out.push({
          id: `src-${src.id}-${ev.date}-${ev.title}`,
          date: ev.date,
          title: ev.title,
          subtitle: src.name,
          tone: toneToMonth(src.tone),
        })
      }
    }
    return out
  }, [sources])

  const conflictEvents = useMemo(() => {
    const schoolByDay = new Map<string, string[]>()
    for (const ev of sourceEvents) {
      const list = schoolByDay.get(ev.date) ?? []
      list.push(ev.title)
      schoolByDay.set(ev.date, list)
    }
    const out: MonthCalendarEvent[] = []
    for (const ep of epEvents) {
      const hits = schoolByDay.get(ep.date)
      if (!hits?.length) continue
      out.push({
        id: `conflict-${ep.id}`,
        date: ep.date,
        title: 'Conflict',
        subtitle: hits.slice(0, 2).join('; '),
        tone: 'rose',
      })
    }
    return out
  }, [epEvents, sourceEvents])

  const monthEvents = useMemo(
    () => [...sourceEvents, ...epEvents, ...conflictEvents],
    [sourceEvents, epEvents, conflictEvents],
  )

  const selectedConflicts = selectedDate
    ? holidayTitlesOnDate(sources, selectedDate)
    : []
  const selectedEp = selectedDate
    ? epEvents.filter((e) => e.date === selectedDate)
    : []

  async function addSource() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/programs/calendar-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          addMode === 'url'
            ? { name, kind: 'ics_url', sourceUrl, tone: 'amber' }
            : { name, kind: 'ics_paste', icsText, tone: 'amber' },
        ),
      })
      const d = (await r.json()) as {
        source?: StaffCalendarSource
        warning?: string
        error?: string
      }
      if (!r.ok) throw new Error(d.error ?? 'Could not add calendar')
      setSources((prev) => [...prev, d.source!].sort((a, b) => a.name.localeCompare(b.name)))
      setSourceUrl('')
      setIcsText('')
      setStatus(
        d.warning
          ? `Added with warning: ${d.warning}`
          : `Added ${d.source?.name ?? 'calendar'} (${d.source?.events.length ?? 0} events).`,
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not add calendar')
    } finally {
      setBusy(false)
    }
  }

  async function refreshSource(id: string) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch(`/api/staff/programs/calendar-sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: true }),
      })
      const d = (await r.json()) as { source?: StaffCalendarSource; error?: string }
      if (!r.ok) throw new Error(d.error ?? 'Refresh failed')
      setSources((prev) => prev.map((s) => (s.id === id ? d.source! : s)))
      setStatus(
        d.source?.lastError
          ? `Refresh warning: ${d.source.lastError}`
          : `Refreshed ${d.source?.name ?? 'calendar'}.`,
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleSource(id: string, active: boolean) {
    setBusy(true)
    try {
      const r = await fetch(`/api/staff/programs/calendar-sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      const d = (await r.json()) as { source?: StaffCalendarSource; error?: string }
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      setSources((prev) => prev.map((s) => (s.id === id ? d.source! : s)))
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function removeSource(id: string, label: string) {
    if (!window.confirm(`Remove ${label} from the planner?`)) return
    setBusy(true)
    try {
      const r = await fetch(`/api/staff/programs/calendar-sources/${id}`, { method: 'DELETE' })
      const d = (await r.json()) as { error?: string }
      if (!r.ok) throw new Error(d.error ?? 'Remove failed')
      setSources((prev) => prev.filter((s) => s.id !== id))
      setStatus(`Removed ${label}.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-[var(--border)] bg-white p-4">
      <div>
        <h3 className="text-base font-bold text-[#1A1A1A]">Planning calendar</h3>
        <p className="mt-1 text-xs text-[#5A6070] whitespace-pre-line">
          {`Add the LCPS (or other school) calendar so holidays show next to EP nights.
Green = Fall CMS meeting dates. Blue = Spring placeholder packet. Amber/slate = school calendars. Rose = conflict.`}
        </p>
        <p className="mt-1 min-h-[1.25rem] text-[11px] text-[#5A6070]" aria-live="polite">
          {busy ? 'Working…' : status || '\u00a0'}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={showSpringPacket}
            onChange={(e) => setShowSpringPacket(e.target.checked)}
          />
          Show Spring 2027 placeholder nights
        </label>
      </div>

      <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--brand-warm)] p-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6070]">
            Add calendar
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              className={`rounded-full border px-3 py-1 font-semibold ${
                addMode === 'url' ? 'border-[var(--brand-green)] text-[var(--brand-green)]' : ''
              }`}
              onClick={() => setAddMode('url')}
            >
              ICS / webcal URL
            </button>
            <button
              type="button"
              className={`rounded-full border px-3 py-1 font-semibold ${
                addMode === 'paste' ? 'border-[var(--brand-green)] text-[var(--brand-green)]' : ''
              }`}
              onClick={() => setAddMode('paste')}
            >
              Paste ICS text
            </button>
          </div>
          {addMode === 'url' ? (
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://…/basic.ics or webcal://…"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
          ) : (
            <textarea
              value={icsText}
              onChange={(e) => setIcsText(e.target.value)}
              rows={5}
              placeholder="Paste BEGIN:VCALENDAR … END:VCALENDAR"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 font-mono text-xs"
            />
          )}
          <Button
            type="button"
            disabled={busy}
            onClick={() => void addSource()}
            className="text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            Add to planner
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6070]">
            Saved calendars
          </p>
          {sources.length === 0 ? (
            <p className="text-sm text-[#5A6070]">
              None yet. Add the LCPS events ICS URL, or paste the .ics file contents.
            </p>
          ) : (
            <ul className="space-y-2">
              {sources.map((src) => (
                <li
                  key={src.id}
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{src.name}</p>
                      <p className="text-xs text-[#5A6070]">
                        {src.events.length} events
                        {src.refreshedAt
                          ? ` · refreshed ${new Date(src.refreshedAt).toLocaleString()}`
                          : ''}
                      </p>
                      {src.lastError ? (
                        <p className="text-xs text-red-700">{src.lastError}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-xs font-semibold underline"
                        disabled={busy || src.kind !== 'ics_url'}
                        onClick={() => void refreshSource(src.id)}
                      >
                        Refresh
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold underline"
                        disabled={busy}
                        onClick={() => void toggleSource(src.id, !src.active)}
                      >
                        {src.active ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold underline text-red-700"
                        disabled={busy}
                        onClick={() => void removeSource(src.id, src.name)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <StaffMonthCalendar
        month={month}
        onMonthChange={setMonth}
        events={monthEvents}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        maxPerDay={4}
      />

      {selectedDate ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--brand-warm)] p-3 text-sm">
          <p className="font-semibold">{selectedDate}</p>
          {selectedEp.length ? (
            <ul className="mt-1 list-disc pl-5 text-[#1A1A1A]">
              {selectedEp.map((e) => (
                <li key={e.id}>
                  {e.title}
                  {e.subtitle ? ` (${e.subtitle})` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[#5A6070]">No EP night on this date.</p>
          )}
          {selectedConflicts.length ? (
            <div className="mt-2">
              <p className="font-semibold text-[#8A3048]">School calendar</p>
              <ul className="list-disc pl-5 text-[#8A3048]">
                {selectedConflicts.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-1 text-[#5A6070]">No school holiday on this date from loaded calendars.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
