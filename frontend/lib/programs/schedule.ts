/**
 * Program meeting schedule helpers to structured CMS fields + display strings.
 */

import { EP_MEETING_DATES_PROPOSED_LABEL } from '@/lib/programs/ep-meeting-dates'

export type ProgramScheduleFields = {
  dayOfWeek?: string | null
  classTime?: string | null
  durationWeeks?: number | null
  startDate?: string | null
  endDate?: string | null
  schedule?: string | null
  detail?: string | null
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const bare = String(iso).slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(bare)) {
    const parsed = new Date(`${bare}T12:00:00`)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function programScheduleParts(
  p: ProgramScheduleFields,
  opts?: { includeCalendarDates?: boolean },
): string[] {
  const parts: string[] = []
  const day = String(p.dayOfWeek ?? '').trim()
  const time = String(p.classTime ?? '').trim()
  const weeks = Number(p.durationWeeks ?? 0)
  const start = formatShortDate(p.startDate)
  const end = formatShortDate(p.endDate)
  const includeCalendarDates = opts?.includeCalendarDates !== false

  if (day) parts.push(day)
  if (time) parts.push(time)
  if (weeks > 0) parts.push(`${weeks} week${weeks === 1 ? '' : 's'}`)
  if (includeCalendarDates) {
    if (start && end) parts.push(`${start} to ${end}`)
    else if (start) parts.push(`Starts ${start}`)
    else if (end) parts.push(`Through ${end}`)
  }

  return parts
}

/** Month + day for the event-style date badge. */
export function programDateBadge(iso: string | null | undefined): { month: string; day: string } | null {
  const bare = String(iso ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bare)) return null
  const parsed = new Date(`${bare}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return {
    month: parsed.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: parsed.toLocaleString('en-US', { day: 'numeric' }),
  }
}

/** One-line summary for cards / calendar: "Tuesdays · 3:30 to 4:30 PM · 8 weeks · Sep 9 to Oct 28" */
export function formatProgramSchedule(
  p: ProgramScheduleFields,
  opts?: { includeCalendarDates?: boolean },
): string {
  const includeCalendarDates = opts?.includeCalendarDates !== false
  const parts = programScheduleParts(p, { includeCalendarDates })
  if (!includeCalendarDates && (p.startDate || p.endDate)) {
    parts.push(EP_MEETING_DATES_PROPOSED_LABEL)
  }
  if (parts.length) return parts.join(' · ')
  // Avoid leaking calendar dates from free-text CMS schedule while nights are draft.
  if (!includeCalendarDates) return EP_MEETING_DATES_PROPOSED_LABEL
  return String(p.schedule ?? '').trim() || String(p.detail ?? '').trim()
}

/** Build CMS `schedule` text from structured fields (keeps older consumers working). */
export function composeScheduleField(p: ProgramScheduleFields): string {
  return formatProgramSchedule(p)
}
