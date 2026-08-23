/** Wix Events v3 REST helpers (Staff create/update). */

const EASTERN_TZ = 'America/New_York'

function wixHeaders(): Record<string, string> {
  const siteId = process.env.WIX_SITE_ID?.trim()
  const apiKey = process.env.WIX_API_KEY?.trim()
  if (!siteId || !apiKey) {
    throw new Error('WIX_SITE_ID and WIX_API_KEY must be set in environment variables')
  }
  return {
    Authorization: apiKey,
    'wix-site-id': siteId,
    'Content-Type': 'application/json',
  }
}

export function wixEventsErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback
  const obj = payload as {
    message?: string
    details?: { applicationError?: { description?: string } }
  }
  return (
    obj.details?.applicationError?.description ||
    obj.message ||
    fallback
  )
}

export async function wixEventsRequest<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
  method = 'POST',
): Promise<T> {
  const res = await fetch(`https://www.wixapis.com${path}`, {
    method,
    headers: wixHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json: Record<string, unknown> = {}
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    throw new Error(
      wixEventsErrorMessage(json, `Wix Events ${method} ${path} failed (${res.status})`),
    )
  }
  return json as T
}

/** Parse datetime-local (YYYY-MM-DDTHH:mm) as Eastern wall time → ISO UTC. */
export function easternDatetimeLocalToIso(local: string): string {
  const m = local.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!m) throw new Error('Invalid date')
  const [, y, mo, d, h, mi] = m
  const want = `${y}-${mo}-${d}T${h}:${mi}:00`
  const base = Date.parse(`${y}-${mo}-${d}T12:00:00.000Z`)
  for (let deltaMin = -16 * 60; deltaMin <= 16 * 60; deltaMin++) {
    const t = new Date(base + deltaMin * 60_000)
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: EASTERN_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(t)
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? ''
    const hour = get('hour') === '24' ? '00' : get('hour')
    const got = `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:00`
    if (got === want) return t.toISOString()
  }
  throw new Error('Could not resolve Eastern time')
}

export function eventDescriptionRichText(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return undefined
  return {
    nodes: [
      {
        type: 'PARAGRAPH',
        nodes: [{ type: 'TEXT', textData: { text: trimmed } }],
      },
    ],
  }
}

export type CreateStaffEventInput = {
  title: string
  description?: string
  locationName: string
  startDate: string
  endDate: string
  initialType: 'RSVP' | 'TICKETING'
  draft: boolean
}

/** Create minimal event, then patch copy (matches working ops scripts). */
export async function createStaffEvent(input: CreateStaffEventInput) {
  const created = await wixEventsRequest<{ event?: { id?: string }; id?: string }>(
    '/events/v3/events',
    {
      event: {
        title: input.title,
        location: { type: 'VENUE', name: input.locationName },
        dateAndTimeSettings: {
          startDate: input.startDate,
          endDate: input.endDate,
          timeZoneId: EASTERN_TZ,
        },
        registration: { initialType: input.initialType },
      },
      draft: input.draft,
    },
  )
  const eventId = created.event?.id ?? created.id ?? ''
  const desc = input.description?.trim()
  if (eventId && desc) {
    await patchStaffEventText(eventId, desc)
  }
  return eventId
}

export async function patchStaffEventText(eventId: string, text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  try {
    await patchStaffEvent(eventId, { shortDescription: trimmed })
  } catch {
    const rich = eventDescriptionRichText(trimmed)
    if (rich) await patchStaffEvent(eventId, { description: rich })
  }
}

export async function patchStaffEvent(
  eventId: string,
  event: Record<string, unknown>,
) {
  await wixEventsRequest(`/events/v3/events/${eventId}`, { event: { id: eventId, ...event } }, 'PATCH')
}
