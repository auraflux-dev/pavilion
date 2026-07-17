import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import type { Committee } from '@/lib/api/meetings'

const COMMITTEES: Committee[] = ['PTO', 'SEAC', 'MSAAC', 'LEAF']

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['secretary', 'admin'])) return null
  return session
}

export async function GET(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const client = getWixClient()
    const includeUnpublished = req.nextUrl.searchParams.get('all') === 'true'
    let query = client.items.query('MeetingMinutes').descending('meetingDate').limit(100)
    if (!includeUnpublished) query = query.eq('published', true)
    const result = await query.find()
    const minutes = (result.items ?? []).map((item) => {
      const row = item as Record<string, unknown>
      return {
        id: String(row._id ?? ''),
        committee: String(row.committee ?? 'PTO'),
        meetingDate: row.meetingDate ? new Date(String(row.meetingDate)).toISOString() : '',
        joinUrl: String(row.joinUrl ?? ''),
        minutesContent: String(row.minutesContent ?? ''),
        summary: String(row.summary ?? ''),
        takeaways: String(row.takeaways ?? ''),
        callToAction: String(row.callToAction ?? ''),
        isUpcoming: row.isUpcoming === true,
        published: row.published !== false,
      }
    })
    return NextResponse.json({ minutes, committees: COMMITTEES })
  } catch (err) {
    console.error('/api/staff/minutes GET', err)
    return NextResponse.json({ error: 'Could not load minutes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const committee = String(body.committee ?? 'PTO') as Committee
    if (!COMMITTEES.includes(committee)) {
      return NextResponse.json({ error: 'Invalid committee' }, { status: 400 })
    }
    const meetingDate = String(body.meetingDate ?? '').trim()
    if (!meetingDate) return NextResponse.json({ error: 'Meeting date required' }, { status: 400 })

    const row = {
      committee,
      meetingDate: new Date(meetingDate).toISOString(),
      joinUrl: String(body.joinUrl ?? '').trim(),
      minutesContent: String(body.minutesContent ?? '').trim(),
      summary: String(body.summary ?? '').trim(),
      takeaways: String(body.takeaways ?? '').trim(),
      callToAction: String(body.callToAction ?? '').trim(),
      isUpcoming: body.isUpcoming === true,
      published: body.published !== false,
    }
    const client = getWixClient()
    const inserted = await client.items.insert('MeetingMinutes', row)
    return NextResponse.json({ ok: true, id: (inserted as { _id?: string })._id })
  } catch (err) {
    console.error('/api/staff/minutes POST', err)
    return NextResponse.json({ error: 'Could not create minutes' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const id = String(body.id ?? '').trim()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const client = getWixClient()
    const existing = (await client.items.get('MeetingMinutes', id)) as Record<string, unknown>
    if (!existing?._id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const committee =
      body.committee != null ? (String(body.committee) as Committee) : (existing.committee as Committee)
    if (body.committee != null && !COMMITTEES.includes(committee)) {
      return NextResponse.json({ error: 'Invalid committee' }, { status: 400 })
    }

    const updates = {
      ...existing,
      _id: id,
      committee,
      meetingDate:
        body.meetingDate != null
          ? new Date(String(body.meetingDate)).toISOString()
          : existing.meetingDate,
      joinUrl: body.joinUrl != null ? String(body.joinUrl).trim() : existing.joinUrl,
      minutesContent:
        body.minutesContent != null ? String(body.minutesContent).trim() : existing.minutesContent,
      summary: body.summary != null ? String(body.summary).trim() : existing.summary,
      takeaways: body.takeaways != null ? String(body.takeaways).trim() : existing.takeaways,
      callToAction:
        body.callToAction != null ? String(body.callToAction).trim() : existing.callToAction,
      isUpcoming: body.isUpcoming != null ? body.isUpcoming === true : existing.isUpcoming === true,
      published: body.published != null ? body.published !== false : existing.published !== false,
    }
    await client.items.update('MeetingMinutes', updates as Parameters<typeof client.items.update>[1])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/staff/minutes PATCH', err)
    return NextResponse.json({ error: 'Could not update minutes' }, { status: 500 })
  }
}
