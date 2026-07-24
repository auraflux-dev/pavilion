import { NextRequest, NextResponse } from 'next/server'
import { getUpcomingEvents } from '@/lib/api/events'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

function gate(req: NextRequest) {
  return getStaffSession(req).then((session) => {
    if (!requireStaffRole(session?.staff ?? null, ['events', 'admin', 'secretary', 'marketing'])) {
      return null
    }
    return session
  })
}

function toDate(input: string): Date {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
  return d
}

export async function GET(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const events = await getUpcomingEvents(30)
    const siteId = process.env.WIX_SITE_ID || '509fda24-8dbf-43c6-aa74-df9f8b63c388'
    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id ?? '',
        title: e.title ?? '',
        description: e.description ?? '',
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

    const startDate = toDate(startRaw)
    const endDate = endRaw ? toDate(endRaw) : startDate

    // Wix Events description is rich-content (object), not a plain string.
    // Create without it, then patch a simple paragraph if copy was provided.
    const client = getWixClient()
    const created = await client.wixEventsV2.createEvent(
      {
        title,
        location: {
          type: 'VENUE',
          name: locationName,
        },
        dateAndTimeSettings: {
          startDate,
          endDate,
          timeZoneId: 'America/New_York',
        },
        registration: {
          initialType,
        },
      } as unknown as Parameters<typeof client.wixEventsV2.createEvent>[0],
      { draft },
    )

    const id = (created as { _id?: string })._id ?? ''
    if (id && description) {
      try {
        await client.wixEventsV2.updateEvent(id, {
          event: {
            description: {
              nodes: [
                {
                  type: 'PARAGRAPH',
                  nodes: [{ type: 'TEXT', textData: { text: description } }],
                },
              ],
            },
          },
        } as unknown as Parameters<typeof client.wixEventsV2.updateEvent>[1])
      } catch (err) {
        console.warn('/api/staff/events description update skipped', err)
      }
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

    return NextResponse.json({
      ok: true,
      id,
      slug: (created as { slug?: string }).slug ?? '',
      status: (created as { status?: string }).status ?? '',
      draft,
      ticketPrice: initialType === 'TICKETING' ? ticketPrice : 0,
    })
  } catch (err) {
    console.error('/api/staff/events POST', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Could not create event. confirm API key has Manage Events permission',
      },
      { status: 400 },
    )
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
    if (body.description != null) event.description = String(body.description).trim()
    if (body.location != null) {
      event.location = { type: 'VENUE', name: String(body.location).trim() || 'SHMS PTO' }
    }
    if (body.startDate || body.endDate) {
      const startDate = body.startDate ? toDate(String(body.startDate)) : undefined
      const endDate = body.endDate ? toDate(String(body.endDate)) : startDate
      event.dateAndTimeSettings = {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        timeZoneId: 'America/New_York',
      }
    }
    if (body.image != null) {
      const url = String(body.image).trim()
      event.mainImage = url ? { url } : null
    }

    await client.wixEventsV2.updateEvent(id, { event } as unknown as Parameters<
      typeof client.wixEventsV2.updateEvent
    >[1])

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

    return NextResponse.json({ ok: true, id, action: 'update' })
  } catch (err) {
    console.error('/api/staff/events PATCH', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not update event' },
      { status: 400 },
    )
  }
}
