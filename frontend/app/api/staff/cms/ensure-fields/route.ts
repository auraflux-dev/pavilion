/**
 * POST /api/staff/cms/ensure-fields
 * Admin-only: create enrichment CMS fields if missing (Programs schedule + flyers, etc.).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function wixHeaders() {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) throw new Error('WIX_API_KEY / WIX_SITE_ID not configured')
  return {
    Authorization: apiKey,
    'wix-site-id': siteId,
    'Content-Type': 'application/json',
  }
}

async function ensureFields(
  collectionId: string,
  fields: { key: string; displayName: string; type: string }[],
) {
  const headers = wixHeaders()
  const getRes = await fetch(`https://www.wixapis.com/wix-data/v2/collections/${collectionId}`, {
    method: 'GET',
    headers,
  })
  const getBody = (await getRes.json().catch(() => ({}))) as {
    collection?: { fields?: { key?: string }[] }
    message?: string
  }
  if (!getRes.ok) {
    return { collectionId, ok: false, error: getBody.message || `GET ${getRes.status}`, created: [] as string[], existing: [] as string[] }
  }
  const existing = new Set((getBody.collection?.fields ?? []).map((f) => String(f.key ?? '')))
  const created: string[] = []
  const already: string[] = []
  for (const field of fields) {
    if (existing.has(field.key)) {
      already.push(field.key)
      continue
    }
    const createRes = await fetch('https://www.wixapis.com/wix-data/v2/collections/create-field', {
      method: 'POST',
      headers,
      body: JSON.stringify({ dataCollectionId: collectionId, field }),
    })
    if (createRes.ok) created.push(field.key)
    else {
      const err = (await createRes.json().catch(() => ({}))) as { message?: string }
      return {
        collectionId,
        ok: false,
        error: err.message || `create-field ${field.key} failed`,
        created,
        existing: already,
      }
    }
  }
  return { collectionId, ok: true, created, existing: already }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const results = []
    results.push(
      await ensureFields('Programs', [
        { key: 'dayOfWeek', displayName: 'Day of Week', type: 'TEXT' },
        { key: 'classTime', displayName: 'Class Time', type: 'TEXT' },
        { key: 'durationWeeks', displayName: 'Duration (Weeks)', type: 'NUMBER' },
        { key: 'startDate', displayName: 'Start Date', type: 'DATE' },
        { key: 'endDate', displayName: 'End Date', type: 'DATE' },
        { key: 'image', displayName: 'Flyer / Image URL', type: 'TEXT' },
        { key: 'schedule', displayName: 'Schedule Summary', type: 'TEXT' },
        { key: 'detail', displayName: 'Detail', type: 'TEXT' },
      ]),
    )
    results.push(
      await ensureFields('PageContent', [
        { key: 'flyerImage', displayName: 'Flyer / Hero Image URL', type: 'TEXT' },
      ]),
    )
    results.push(
      await ensureFields('StaffRoles', [
        { key: 'assignedProgramIds', displayName: 'Assigned Program IDs', type: 'TEXT' },
      ]),
    )
    results.push(
      await ensureFields('ProgramEnrollments', [
        { key: 'waitlistPosition', displayName: 'Waitlist Position', type: 'NUMBER' },
        { key: 'requestNote', displayName: 'Request Note', type: 'TEXT' },
        { key: 'requestedAt', displayName: 'Requested At', type: 'DATETIME' },
        { key: 'requestedToProgramId', displayName: 'Requested To Program ID', type: 'TEXT' },
        { key: 'requestedToProgramName', displayName: 'Requested To Program Name', type: 'TEXT' },
        { key: 'refundNote', displayName: 'Refund Note', type: 'TEXT' },
        { key: 'refundedAt', displayName: 'Refunded At', type: 'DATETIME' },
        { key: 'refundedByEmail', displayName: 'Refunded By Email', type: 'TEXT' },
        { key: 'transferredAt', displayName: 'Transferred At', type: 'DATETIME' },
        { key: 'transferredFromProgramId', displayName: 'Transferred From Program ID', type: 'TEXT' },
      ]),
    )

    const headers = wixHeaders()

    // Create ProgramAttendance if missing, else ensure fields
    const attGet = await fetch('https://www.wixapis.com/wix-data/v2/collections/ProgramAttendance', {
      method: 'GET',
      headers,
    })
    if (attGet.status === 404 || !attGet.ok) {
      const createAtt = await fetch('https://www.wixapis.com/wix-data/v2/collections', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          collection: {
            id: 'ProgramAttendance',
            displayName: 'Program Attendance',
            fields: [
              { key: 'programId', displayName: 'Program ID', type: 'TEXT' },
              { key: 'programName', displayName: 'Program Name', type: 'TEXT' },
              { key: 'sessionId', displayName: 'Session ID', type: 'TEXT' },
              { key: 'sessionDate', displayName: 'Session Date', type: 'TEXT' },
              { key: 'studentId', displayName: 'Student ID', type: 'TEXT' },
              { key: 'studentName', displayName: 'Student Name', type: 'TEXT' },
              { key: 'parentEmail', displayName: 'Parent Email', type: 'TEXT' },
              { key: 'status', displayName: 'Status', type: 'TEXT' },
              { key: 'checkedInAt', displayName: 'Checked In At', type: 'DATETIME' },
              { key: 'checkedOutAt', displayName: 'Checked Out At', type: 'DATETIME' },
              { key: 'markedByEmail', displayName: 'Marked By Email', type: 'TEXT' },
              { key: 'notes', displayName: 'Notes', type: 'TEXT' },
            ],
            permissions: {
              insert: 'ADMIN',
              update: 'ADMIN',
              remove: 'ADMIN',
              read: 'ADMIN',
            },
          },
        }),
      })
      const createAttBody = await createAtt.json().catch(() => ({}))
      results.push({
        collectionId: 'ProgramAttendance',
        ok: createAtt.ok,
        created: createAtt.ok ? ['(collection)'] : [],
        existing: [],
        error: createAtt.ok ? undefined : JSON.stringify(createAttBody).slice(0, 200),
      })
    } else {
      results.push(
        await ensureFields('ProgramAttendance', [
          { key: 'programId', displayName: 'Program ID', type: 'TEXT' },
          { key: 'programName', displayName: 'Program Name', type: 'TEXT' },
          { key: 'sessionId', displayName: 'Session ID', type: 'TEXT' },
          { key: 'sessionDate', displayName: 'Session Date', type: 'TEXT' },
          { key: 'studentId', displayName: 'Student ID', type: 'TEXT' },
          { key: 'studentName', displayName: 'Student Name', type: 'TEXT' },
          { key: 'parentEmail', displayName: 'Parent Email', type: 'TEXT' },
          { key: 'status', displayName: 'Status', type: 'TEXT' },
          { key: 'checkedInAt', displayName: 'Checked In At', type: 'DATETIME' },
          { key: 'checkedOutAt', displayName: 'Checked Out At', type: 'DATETIME' },
          { key: 'markedByEmail', displayName: 'Marked By Email', type: 'TEXT' },
          { key: 'notes', displayName: 'Notes', type: 'TEXT' },
        ]),
      )
    }

    // Create ContractorTimesheets if missing
    const tsGet = await fetch('https://www.wixapis.com/wix-data/v2/collections/ContractorTimesheets', {
      method: 'GET',
      headers,
    })
    if (tsGet.status === 404 || !tsGet.ok) {
      const createRes = await fetch('https://www.wixapis.com/wix-data/v2/collections', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          collection: {
            id: 'ContractorTimesheets',
            displayName: 'Contractor Timesheets',
            fields: [
              { key: 'staffEmail', displayName: 'Staff Email', type: 'TEXT' },
              { key: 'staffName', displayName: 'Staff Name', type: 'TEXT' },
              { key: 'programId', displayName: 'Program ID', type: 'TEXT' },
              { key: 'programName', displayName: 'Program Name', type: 'TEXT' },
              { key: 'workDate', displayName: 'Work Date', type: 'DATE' },
              { key: 'startTime', displayName: 'Start Time', type: 'TEXT' },
              { key: 'endTime', displayName: 'End Time', type: 'TEXT' },
              { key: 'hours', displayName: 'Hours', type: 'NUMBER' },
              { key: 'notes', displayName: 'Notes', type: 'TEXT' },
              { key: 'status', displayName: 'Status', type: 'TEXT' },
              { key: 'submittedAt', displayName: 'Submitted At', type: 'DATETIME' },
              { key: 'reviewedByEmail', displayName: 'Reviewed By Email', type: 'TEXT' },
              { key: 'reviewedAt', displayName: 'Reviewed At', type: 'DATETIME' },
              { key: 'reviewNote', displayName: 'Review Note', type: 'TEXT' },
            ],
            permissions: {
              insert: 'ADMIN',
              update: 'ADMIN',
              remove: 'ADMIN',
              read: 'ADMIN',
            },
          },
        }),
      })
      const createBody = await createRes.json().catch(() => ({}))
      results.push({
        collectionId: 'ContractorTimesheets',
        ok: createRes.ok,
        created: createRes.ok ? ['(collection)'] : [],
        existing: [],
        error: createRes.ok ? undefined : JSON.stringify(createBody).slice(0, 200),
      })
    } else {
      results.push({
        collectionId: 'ContractorTimesheets',
        ok: true,
        created: [],
        existing: ['(collection)'],
      })
    }

    for (const spec of [
      {
        id: 'EventTicketOffers',
        displayName: 'Event Ticket Offers',
        fields: [
          { key: 'eventId', displayName: 'Event ID', type: 'TEXT' },
          { key: 'eventTitle', displayName: 'Event Title', type: 'TEXT' },
          { key: 'ticketPrice', displayName: 'Ticket Price', type: 'NUMBER' },
          { key: 'capacity', displayName: 'Capacity', type: 'NUMBER' },
          { key: 'soldCount', displayName: 'Sold Count', type: 'NUMBER' },
          { key: 'active', displayName: 'Active', type: 'BOOLEAN' },
          { key: 'registrationOpen', displayName: 'Registration Open', type: 'BOOLEAN' },
        ],
      },
      {
        id: 'EventTicketOrders',
        displayName: 'Event Ticket Orders',
        fields: [
          { key: 'eventId', displayName: 'Event ID', type: 'TEXT' },
          { key: 'eventTitle', displayName: 'Event Title', type: 'TEXT' },
          { key: 'parentEmail', displayName: 'Parent Email', type: 'TEXT' },
          { key: 'parentName', displayName: 'Parent Name', type: 'TEXT' },
          { key: 'quantity', displayName: 'Quantity', type: 'NUMBER' },
          { key: 'amount', displayName: 'Amount', type: 'NUMBER' },
          { key: 'ticketPrice', displayName: 'Ticket Price', type: 'NUMBER' },
          { key: 'transactionId', displayName: 'Transaction ID', type: 'TEXT' },
          { key: 'status', displayName: 'Status', type: 'TEXT' },
          { key: 'purchasedAt', displayName: 'Purchased At', type: 'DATETIME' },
        ],
      },
      {
        id: 'KbArticles',
        displayName: 'Help Knowledge Base',
        fields: [
          { key: 'audience', displayName: 'Audience', type: 'TEXT' },
          { key: 'categoryId', displayName: 'Category ID', type: 'TEXT' },
          { key: 'slug', displayName: 'Slug', type: 'TEXT' },
          { key: 'title', displayName: 'Title', type: 'TEXT' },
          { key: 'summary', displayName: 'Summary', type: 'TEXT' },
          { key: 'body', displayName: 'Body', type: 'TEXT' },
          { key: 'order', displayName: 'Sort Order', type: 'NUMBER' },
          { key: 'adminOnly', displayName: 'Admin Only', type: 'BOOLEAN' },
          { key: 'need', displayName: 'Role Gate', type: 'TEXT' },
          { key: 'active', displayName: 'Active', type: 'BOOLEAN' },
        ],
      },
    ] as const) {
      const getRes = await fetch(`https://www.wixapis.com/wix-data/v2/collections/${spec.id}`, {
        method: 'GET',
        headers,
      })
      if (getRes.status === 404 || !getRes.ok) {
        const createRes = await fetch('https://www.wixapis.com/wix-data/v2/collections', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            collection: {
              id: spec.id,
              displayName: spec.displayName,
              fields: [...spec.fields],
              permissions: {
                insert: 'ADMIN',
                update: 'ADMIN',
                remove: 'ADMIN',
                read: 'ADMIN',
              },
            },
          }),
        })
        const createBody = await createRes.json().catch(() => ({}))
        results.push({
          collectionId: spec.id,
          ok: createRes.ok,
          created: createRes.ok ? ['(collection)'] : [],
          existing: [],
          error: createRes.ok ? undefined : JSON.stringify(createBody).slice(0, 200),
        })
      } else {
        results.push(
          await ensureFields(
            spec.id,
            spec.fields.map((f) => ({ key: f.key, displayName: f.displayName, type: f.type })),
          ),
        )
      }
    }

    return NextResponse.json({ ok: results.every((r) => r.ok), results })
  } catch (err) {
    console.error('ensure-fields', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not ensure fields' },
      { status: 500 },
    )
  }
}
