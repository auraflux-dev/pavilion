import { GOOGLE_SCOPES, getStaffGoogleAccess } from '@/lib/google/workspace-auth'

export type CalendarEventItem = {
  id: string
  summary: string
  description: string
  location: string
  start: string
  end: string
  htmlLink: string
  calendarId: string
  allDay: boolean
}

export async function listUpcomingEvents(
  staffEmail: string,
  days = 45,
): Promise<CalendarEventItem[]> {
  const access = await getStaffGoogleAccess(staffEmail, GOOGLE_SCOPES.calendar)
  if (!access) throw new Error('Google Calendar is not connected for this staff account')

  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + days * 86400000).toISOString()
  const params = new URLSearchParams({
    calendarId: 'primary',
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin,
    timeMax,
    maxResults: '40',
  })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${access.accessToken}` } },
  )
  const data = (await res.json()) as {
    items?: {
      id?: string
      summary?: string
      description?: string
      location?: string
      htmlLink?: string
      start?: { dateTime?: string; date?: string }
      end?: { dateTime?: string; date?: string }
    }[]
    error?: { message?: string }
  }
  if (!res.ok) throw new Error(data.error?.message || 'Could not load calendar')

  return (data.items ?? [])
    .filter((e) => e.id)
    .map((e) => ({
      id: e.id!,
      summary: e.summary || '(no title)',
      description: e.description || '',
      location: e.location || '',
      start: e.start?.dateTime || e.start?.date || '',
      end: e.end?.dateTime || e.end?.date || '',
      htmlLink: e.htmlLink || '',
      calendarId: 'primary',
      allDay: Boolean(e.start?.date && !e.start?.dateTime),
    }))
}
