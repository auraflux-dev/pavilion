import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/staff/session'
import { listUpcomingEvents } from '@/lib/google/calendar'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  try {
    const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get('days') || 45)))
    const events = await listUpcomingEvents(session.email, days)
    return NextResponse.json({ events })
  } catch (err) {
    console.error('/api/staff/workspace/calendar GET', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Calendar unavailable' },
      { status: 503 },
    )
  }
}
