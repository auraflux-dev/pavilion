/**
 * Minimal ICS parser for staff EP planning overlays.
 * Extracts all-day / date-valued events as YYYY-MM-DD + title.
 */

export type IcsCalendarEvent = {
  date: string
  title: string
  /** Inclusive end date for multi-day events (exclusive in ICS DTEND for all-day). */
  endDate?: string
}

function unfoldIcs(raw: string): string {
  return String(raw ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '')
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
}

/** Parse YYYYMMDD or YYYYMMDDTHHMMSS(Z) → YYYY-MM-DD in America/New_York when timed. */
export function icsDateToYmd(raw: string): string | null {
  const s = String(raw ?? '').trim()
  const dayOnly = s.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (dayOnly) return `${dayOnly[1]}-${dayOnly[2]}-${dayOnly[3]}`
  const stamp = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/)
  if (!stamp) return null
  const iso = `${stamp[1]}-${stamp[2]}-${stamp[3]}T${stamp[4]}:${stamp[5]}:${stamp[6]}${stamp[7] || ''}`
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return `${stamp[1]}-${stamp[2]}-${stamp[3]}`
  return new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

function eachYmdInclusive(start: string, endExclusiveOrSame: string | null): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return []
  const out: string[] = []
  const startD = new Date(`${start}T12:00:00`)
  let endD = startD
  if (endExclusiveOrSame && /^\d{4}-\d{2}-\d{2}$/.test(endExclusiveOrSame)) {
    // ICS all-day DTEND is exclusive. Timed events may share the same day.
    const exclusive = new Date(`${endExclusiveOrSame}T12:00:00`)
    if (exclusive.getTime() > startD.getTime()) {
      endD = new Date(exclusive.getTime() - 24 * 60 * 60 * 1000)
    } else {
      endD = startD
    }
  }
  for (let d = new Date(startD); d.getTime() <= endD.getTime(); d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${day}`)
  }
  return out
}

/**
 * Parse VEVENT blocks. Ignores RRULE expansion (LCPS holidays are usually one-shot).
 */
export function parseIcsEvents(raw: string): IcsCalendarEvent[] {
  const text = unfoldIcs(raw)
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1)
  const events: IcsCalendarEvent[] = []
  for (const block of blocks) {
    const body = block.split(/END:VEVENT/i)[0] ?? ''
    const summaryMatch = body.match(/^SUMMARY[^:]*:(.*)$/im)
    const startMatch = body.match(/^DTSTART[^:]*:(\S+)/im)
    const endMatch = body.match(/^DTEND[^:]*:(\S+)/im)
    if (!summaryMatch || !startMatch) continue
    const title = unescapeIcsText(summaryMatch[1] ?? '')
    if (!title) continue
    const start = icsDateToYmd(startMatch[1] ?? '')
    if (!start) continue
    const end = endMatch ? icsDateToYmd(endMatch[1] ?? '') : null
    const days = eachYmdInclusive(start, end)
    for (const date of days) {
      events.push({
        date,
        title,
        ...(days.length > 1 ? { endDate: days[days.length - 1] } : {}),
      })
    }
  }
  // Dedupe same day+title
  const seen = new Set<string>()
  const unique: IcsCalendarEvent[] = []
  for (const ev of events) {
    const key = `${ev.date}|${ev.title.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(ev)
  }
  return unique.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}

/** Normalize webcal:// to https:// for server fetch. */
export function normalizeCalendarFeedUrl(url: string): string {
  const u = String(url ?? '').trim()
  if (!u) return ''
  if (/^webcal:\/\//i.test(u)) return u.replace(/^webcal:\/\//i, 'https://')
  return u
}

export async function fetchIcsText(url: string): Promise<string> {
  const normalized = normalizeCalendarFeedUrl(url)
  if (!/^https:\/\//i.test(normalized)) {
    throw new Error('Calendar URL must be https (or webcal).')
  }
  const res = await fetch(normalized, {
    headers: { Accept: 'text/calendar, text/plain, */*' },
    redirect: 'follow',
    // School feeds change; avoid long CDN stale.
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Could not fetch calendar (${res.status})`)
  const text = await res.text()
  if (!/BEGIN:VCALENDAR/i.test(text) && !/BEGIN:VEVENT/i.test(text)) {
    throw new Error('URL did not return an ICS calendar file')
  }
  return text
}
