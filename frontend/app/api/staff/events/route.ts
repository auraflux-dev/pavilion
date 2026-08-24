import { NextRequest, NextResponse } from 'next/server'
import { getUpcomingEvents } from '@/lib/api/events'
import { getWixClient } from '@/lib/wix-client'
import {
  createStaffEvent,
  easternDatetimeLocalToIso,
  patchStaffEvent,
  patchStaffEventText,
  wixEventsErrorMessage,
} from '@/lib/wix/events-api'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { revalidatePublicEvents } from '@/lib/staff/revalidate-public'

const STAFF_EVENTS_API_VERSION = 3

function gate(req: NextRequest) {
  return getStaffSession(req).then((session) => {
    if (!requireStaffRole(session?.staff ?? null, ['events', 'admin', 'secretary', 'marketing'])) {
      return null
    }
    return session
  })
}

function parseStaffDatetime(raw: string): string {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) throw new Error('Invalid date')
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return easternDatetimeLocalToIso(trimmed)
  }
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
  return d.toISOString()
}

export async function GET(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const events = await getUpcomingEvents(30)
    const siteId = process.env.WIX_SITE_ID || '509fda24-8dbf-43c6-aa74-df9f8b63c388'
    return NextResponse.json({
      apiVersion: STAFF_EVENTS_API_VERSION,
      events: events.map((e) => ({
        id: e.id ?? '',
        title: e.title ?? '',
        description: e.description ?? e.shortDescription ?? '',
        location: e.location?.name ?? '',
        startDate: e.dateAndTimeSettings?.startDate ?? '',
        endDate: e.dateAndTimeSettings?.endDate ?? '',
        slug: e.slug ?? '',
        image: e.mainImage?.url ?? '',
      })),
      manageUrl: `https://manage.wix.com/dashboard/${siteId}/events`,
      note: 'Create, publish, or cancel events here. Upload a flyer so /events shows an image. They appear on the public /events page.',
    })
  } catch (err) {
    console.error('/api/staff/events GET', err)
    return NextResponse.json({ error: 'Could not load events' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const title = String(body.title ?? '').trim()
    const description = String(body.description ?? '').trim()
    const locationName = String(body.location ?? '').trim() || 'SHMS PTO'
    const startRaw = String(body.startDate ?? '').trim()
    const endRaw = String(body.endDate ?? '').trim()
    const draft = body.draft === true
    const registrationType = String(body.registrationType ?? 'RSVP').toUpperCase()
    const initialType =
      registrationType === 'TICKETING' || registrationType === 'TICKETS' ? 'TICKETING' : 'RSVP'

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    if (!startRaw) return NextResponse.json({ error: 'Start date is required' }, { status: 400 })

    const startDate = parseStaffDatetime(startRaw)
    const endDate = endRaw ? parseStaffDatetime(endRaw) : startDate

    const id = await createStaffEvent({
      title,
      description,
      locationName,
      startDate,
      endDate,
      initialType,
      draft,
    })

    if (!id) {
      return NextResponse.json({ error: 'Wix did not return an event id' }, { status: 400 })
    }

    const ticketPrice = Number(body.ticketPrice ?? 0) || 0
    const capacity = Number(body.capacity ?? 0) || 0
    if (id && initialType === 'TICKETING' && ticketPrice > 0) {
      const { upsertEventTicketOffer } = await import('@/lib/events/tickets')
      await upsertEventTicketOffer({
        eventId: id,
        eventTitle: title,
        ticketPrice,
        capacity,
        registrationOpen: !draft,
        active: true,
      })
    }

    revalidatePublicEvents()
    return NextResponse.json({
      ok: true,
      id,
      slug: '',
      status: draft ? 'DRAFT' : 'SCHEDULED',
      draft,
      ticketPrice: initialType === 'TICKETING' ? ticketPrice : 0,
    })
  } catch (err) {
    console.error('/api/staff/events POST', err)
    let message =
      err instanceof Error
        ? err.message
        : 'Could not create event. Confirm API key has Manage Events permission.'
    try {
      const parsed = JSON.parse(message) as unknown
      message = wixEventsErrorMessage(parsed, message)
    } catch {
      /* use message as-is */
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const id = String(body.id ?? '').trim()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const client = getWixClient()

    if (body.action === 'publish') {
      await client.wixEventsV2.publishDraftEvent(id)
      return NextResponse.json({ ok: true, id, action: 'publish' })
    }
    if (body.action === 'cancel') {
      await client.wixEventsV2.cancelEvent(id)
      return NextResponse.json({ ok: true, id, action: 'cancel' })
    }

    const event: Record<string, unknown> = {}
    if (body.title != null) event.title = String(body.title).trim()
    if (body.location != null) {
      event.location = { type: 'VENUE', name: String(body.location).trim() || 'SHMS PTO' }
    }
    if (body.startDate || body.endDate) {
      const startDate = body.startDate ? parseStaffDatetime(String(body.startDate)) : undefined
      const endDate = body.endDate ? parseStaffDatetime(String(body.endDate)) : startDate
      event.dateAndTimeSettings = {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        timeZoneId: 'America/New_York',
      }
    }
    const imageId = String(body.imageId ?? '').trim()
    if (imageId) {
      event.mainImage = { id: imageId }
    } else if (body.image === null || body.image === '') {
      event.mainImage = null
    }

    if (Object.keys(event).length > 0) {
      await patchStaffEvent(id, event)
    }

    if (body.description != null) {
      await patchStaffEventText(id, String(body.description))
    }

    if (body.ticketPrice != null || body.capacity != null || body.ticketsOpen != null) {
      const ticketPrice = Number(body.ticketPrice ?? 0) || 0
      if (ticketPrice > 0) {
        const { upsertEventTicketOffer } = await import('@/lib/events/tickets')
        await upsertEventTicketOffer({
          eventId: id,
          eventTitle: String(body.title ?? event.title ?? 'Event'),
          ticketPrice,
          capacity: Number(body.capacity ?? 0) || 0,
          registrationOpen: body.ticketsOpen !== false,
          active: true,
        })
      }
    }

    revalidatePublicEvents()
    return NextResponse.json({ ok: true, id, action: 'update' })
  } catch (err) {
    console.error('/api/staff/events PATCH', err)
    let message = err instanceof Error ? err.message : 'Could not update event'
    try {
      const parsed = JSON.parse(message) as unknown
      message = wixEventsErrorMessage(parsed, message)
    } catch {
      /* use message as-is */
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
