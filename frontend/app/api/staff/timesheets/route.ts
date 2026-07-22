/**
 * GET   /api/staff/timesheets — own rows (instructors) or all (programs/admin)
 * POST  /api/staff/timesheets — submit hours for an assigned program
 * PATCH /api/staff/timesheets — VP Programs / admin approve or reject
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { canAccessProgram, canManageAllPrograms } from '@/lib/staff/roles'
import {
  createTimesheet,
  listTimesheets,
  reviewTimesheet,
} from '@/lib/staff/timesheets'
import { getWixClient } from '@/lib/wix-client'

export const dynamic = 'force-dynamic'

function canSubmit(session: NonNullable<Awaited<ReturnType<typeof getStaffSession>>>) {
  return requireStaffRole(session.staff, [
    'instructor',
    'coordinator',
    'programs',
    'admin',
  ])
}

function canReview(session: NonNullable<Awaited<ReturnType<typeof getStaffSession>>>) {
  return requireStaffRole(session.staff, ['programs', 'admin'])
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !canSubmit(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const review = canReview(session)
    const rows = review
      ? await listTimesheets()
      : await listTimesheets({ staffEmail: session.email })

    // Programs list for the submit form (scoped)
    const client = getWixClient()
    const programs = await client.items.query('Programs').ascending('name').limit(100).find()
    let programOptions = (programs.items ?? []).map((p) => ({
      id: String((p as { _id?: string })._id ?? ''),
      name: String((p as { name?: string }).name ?? ''),
    }))
    if (!canManageAllPrograms(session.staff)) {
      programOptions = programOptions.filter((p) => canAccessProgram(session.staff, p.id))
    }

    return NextResponse.json({
      timesheets: rows,
      programs: programOptions,
      canReview: review,
      canSubmit: true,
    })
  } catch (err) {
    console.error('timesheets GET', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Could not load timesheets (create ContractorTimesheets CMS collection if missing)',
      },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !canSubmit(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const programId = String(body.programId ?? '').trim()
    if (!canAccessProgram(session.staff, programId) && !canManageAllPrograms(session.staff)) {
      return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
    }
    const programName = String(body.programName ?? '').trim()
    const created = await createTimesheet({
      staffEmail: session.email,
      staffName: session.staff.name || session.staff.boardTitle || session.email,
      programId,
      programName,
      workDate: String(body.workDate ?? ''),
      startTime: String(body.startTime ?? ''),
      endTime: String(body.endTime ?? ''),
      notes: String(body.notes ?? ''),
    })
    return NextResponse.json({ ok: true, timesheet: created })
  } catch (err) {
    console.error('timesheets POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not submit timesheet' },
      { status: 400 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !canReview(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const id = String(body.id ?? '').trim()
    const action = String(body.action ?? '')
    if (!id || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: 'id and action (approve|reject) required' }, { status: 400 })
    }
    const updated = await reviewTimesheet({
      id,
      action,
      reviewedByEmail: session.email,
      reviewNote: String(body.reviewNote ?? ''),
    })
    return NextResponse.json({ ok: true, timesheet: updated })
  } catch (err) {
    console.error('timesheets PATCH', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not update timesheet' },
      { status: 400 },
    )
  }
}
