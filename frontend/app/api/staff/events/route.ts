import { NextRequest, NextResponse } from 'next/server'
import { getUpcomingEvents } from '@/lib/api/events'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['events', 'admin', 'secretary', 'marketing'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const events = await getUpcomingEvents(20)
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
      })),
      manageUrl: `https://manage.wix.com/dashboard/${siteId}/events`,
      note: 'Create and edit events in the Wix Events app. This Staff view lists upcoming events and links to manage them.',
    })
  } catch (err) {
    console.error('/api/staff/events GET', err)
    return NextResponse.json({ error: 'Could not load events' }, { status: 500 })
  }
}
