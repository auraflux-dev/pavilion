/**
 * Program meeting schedule helpers to structured CMS fields + display strings.
 */

export type ProgramScheduleFields = {
  dayOfWeek?: string | null
  classTime?: string | null
  durationWeeks?: number | null
  startDate?: string | null
  endDate?: string | null
  schedule?: string | null
  detail?: string | null
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    // Already a date-only string like 2026-09-09
    const bare = String(iso).slice(0, 10)
    const parsed = new Date(`${bare}T12:00:00`)
    if (Number.isNaN(parsed.getTime())) return String(iso)
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** One-line summary for cards / calendar: "Tuesdays · 3:30 to 4:30 PM · 8 weeks · Sep 9 to Oct 28" */
export function formatProgramSchedule(p: ProgramScheduleFields): string {
  const parts: string[] = []
  const day = String(p.dayOfWeek ?? '').trim()
  const time = String(p.classTime ?? '').trim()
  const weeks = Number(p.durationWeeks ?? 0)
  const start = formatShortDate(p.startDate)
  const end = formatShortDate(p.endDate)

  if (day) parts.push(day)
  if (time) parts.push(time)
  if (weeks > 0) parts.push(`${weeks} week${weeks === 1 ? '' : 's'}`)
  if (start && end) parts.push(`${start} to ${end}`)
  else if (start) parts.push(`Starts ${start}`)
  else if (end) parts.push(`Through ${end}`)

  if (parts.length) return parts.join(' · ')

  const legacy = String(p.schedule ?? '').trim() || String(p.detail ?? '').trim()
  return legacy
}

/** Build CMS `schedule` text from structured fields (keeps older consumers working). */
export function composeScheduleField(p: ProgramScheduleFields): string {
  return formatProgramSchedule(p)
}
