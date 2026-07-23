import { GOOGLE_SCOPES, getStaffGoogleAccess } from '@/lib/google/workspace-auth'

export type CalendarEventAttachment = {
  title: string
  fileUrl: string
  mimeType: string
}

export type CalendarEventItem = {
  id: string
  summary: string
  description: string
  location: string
  start: string
  end: string
  htmlLink: string
  /** Google Meet / Zoom / Teams join URL when present on the invite. */
  meetingLink: string
  calendarId: string
  allDay: boolean
  attachments: CalendarEventAttachment[]
}

function pickMeetingLink(e: {
  hangoutLink?: string
  description?: string
  conferenceData?: {
    entryPoints?: { entryPointType?: string; uri?: string }[]
  }
  location?: string
}): string {
  if (e.hangoutLink?.trim()) return e.hangoutLink.trim()
  const entries = e.conferenceData?.entryPoints ?? []
  const video = entries.find((p) => p.entryPointType === 'video' && p.uri?.trim())
  if (video?.uri) return video.uri.trim()
  const any = entries.find((p) => p.uri?.trim())
  if (any?.uri) return any.uri.trim()

  const blob = `${e.description || ''}\n${e.location || ''}`
  const meet = blob.match(/https:\/\/meet\.google\.com\/[a-z0-9-]+/i)
  if (meet?.[0]) return meet[0]
  const zoom = blob.match(/https:\/\/[\w.-]*zoom\.us\/j\/\S+/i)
  if (zoom?.[0]) return zoom[0].replace(/[).,;]+$/, '')
  const teams = blob.match(/https:\/\/teams\.microsoft\.com\/l\/meetup-join\/\S+/i)
  if (teams?.[0]) return teams[0].replace(/[).,;]+$/, '')
  return ''
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
    // Needed so conferenceData / Meet links are returned on listed events
    conferenceDataVersion: '1',
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
      hangoutLink?: string
      conferenceData?: {
        entryPoints?: { entryPointType?: string; uri?: string }[]
      }
      attachments?: { fileUrl?: string; title?: string; mimeType?: string }[]
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
      meetingLink: pickMeetingLink(e),
      calendarId: 'primary',
      allDay: Boolean(e.start?.date && !e.start?.dateTime),
      attachments: (e.attachments ?? [])
        .filter((a) => a.fileUrl)
        .map((a) => ({
          title: a.title || 'Attachment',
          fileUrl: a.fileUrl!,
          mimeType: a.mimeType || '',
        })),
    }))
}
