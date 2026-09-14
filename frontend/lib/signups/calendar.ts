/** Public calendar deep-links / .ics helpers for sign-up slots. */

export type CalendarEvent = {
  title: string
  description: string
  location: string
  startTime: string
  endTime: string
}

function utcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    details: event.description,
    location: event.location,
    dates: `${utcStamp(event.startTime)}/${utcStamp(event.endTime)}`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Outlook Web / Microsoft 365 compose deeplink. */
export function generateOutlookWebUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: event.description,
    location: event.location,
    startdt: new Date(event.startTime).toISOString(),
    enddt: new Date(event.endTime).toISOString(),
  })
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`
}

export function buildIcsContent(event: CalendarEvent): string {
  const escape = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SHMS PTO//Sign-ups//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:signup-${utcStamp(event.startTime)}-${Math.random().toString(36).slice(2, 10)}@shmspto.org`,
    `DTSTAMP:${utcStamp(new Date().toISOString())}`,
    `DTSTART:${utcStamp(event.startTime)}`,
    `DTEND:${utcStamp(event.endTime)}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape(event.description)}`,
    `LOCATION:${escape(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcsFile(event: CalendarEvent, filename: string): void {
  const blob = new Blob([buildIcsContent(event)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function formatSlotWhen(
  startsAt: string | null,
  endsAt: string | null,
  timeZone = 'America/New_York',
): { dateStr: string; timeStr: string } {
  if (!startsAt) return { dateStr: 'Date TBD', timeStr: '' }
  const start = new Date(startsAt)
  const end = endsAt ? new Date(endsAt) : null
  const dateStr = start.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone,
  })
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }
  const startLabel = start.toLocaleTimeString('en-US', timeOpts)
  const endLabel = end ? end.toLocaleTimeString('en-US', timeOpts) : ''
  return {
    dateStr,
    timeStr: endLabel ? `${startLabel} – ${endLabel}` : startLabel,
  }
}
