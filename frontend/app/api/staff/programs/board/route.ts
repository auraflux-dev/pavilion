/**
 * GET  /api/staff/programs/board?programId=
 * POST /api/staff/programs/board { programId, subject, body }
 *
 * Class chalkboard: save ProgramBoardPosts and fan out ParentMessages
 * to enrolled + waitlisted parents (same audience as message-class).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { STAFF_ROLES, canAccessProgram } from '@/lib/staff/roles'
import {
  ACTIVE_ENROLL_STATUSES,
  WAITLIST_STATUS,
  listProgramEnrollments,
} from '@/lib/programs/enrollments'
import { getProgramById } from '@/lib/api/programs'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, [...STAFF_ROLES])) {
    return null
  }
  return session
}

export async function GET(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const programId = req.nextUrl.searchParams.get('programId')?.trim() || ''
  if (!programId) {
    return NextResponse.json({ error: 'programId required' }, { status: 400 })
  }
  if (!canAccessProgram(session.staff, programId)) {
    return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
  }

  try {
    const client = getWixClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = await (client.items.query('ProgramBoardPosts') as any)
      .eq('programId', programId)
      .eq('active', true)
      .descending('sentAt')
      .limit(30)
      .find()
      .catch(() => ({ items: [] }))

    const posts = (found.items ?? []).map((row: Record<string, unknown>) => ({
      id: String(row._id ?? ''),
      programId: String(row.programId ?? ''),
      programName: String(row.programName ?? ''),
      subject: String(row.subject ?? ''),
      body: String(row.body ?? ''),
      fromName: String(row.fromName ?? ''),
      fromEmail: String(row.fromEmail ?? ''),
      sentAt: row.sentAt ? String(row.sentAt) : null,
    }))

    return NextResponse.json({ posts })
  } catch (err) {
    console.error('/api/staff/programs/board GET', err)
    return NextResponse.json({ error: 'Could not load board posts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const programId = String(body.programId ?? '').trim()
    const subject = String(body.subject ?? '').trim()
    const message = String(body.body ?? '').trim()
    if (!programId || !subject || !message) {
      return NextResponse.json({ error: 'programId, subject, and body required' }, { status: 400 })
    }
    if (!canAccessProgram(session.staff, programId)) {
      return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
    }

    const program = await getProgramById(programId)
    if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 })

    const rows = await listProgramEnrollments(programId)
    const parents = Array.from(
      new Set(
        rows
          .filter((r) => {
            const s = String(r.status ?? '')
            return ACTIVE_ENROLL_STATUSES.has(s) || s === WAITLIST_STATUS
          })
          .map((r) => String(r.parentEmail ?? '').trim().toLowerCase())
          .filter(Boolean),
      ),
    )
    if (!parents.length) {
      return NextResponse.json({ error: 'No parents on this roster yet' }, { status: 400 })
    }

    const client = getWixClient()
    const fromName = session.staff.name || session.staff.boardTitle || session.email
    const fromEmail = session.staff.email || session.email
    const sentAt = new Date().toISOString()
    const programName = program.name || programId

    const inserted = await client.items.insert('ProgramBoardPosts', {
      programId,
      programName,
      subject,
      body: message,
      fromName,
      fromEmail,
      sentAt,
      active: true,
    })
    const postId = String((inserted as { _id?: string })?._id ?? '')

    for (const parentEmail of parents) {
      await client.items.insert('ParentMessages', {
        parentEmail,
        audience: 'program',
        grade: null,
        studentId: null,
        studentName: null,
        programName,
        fromName,
        subject,
        body: message,
        sentAt,
        active: true,
      })
    }

    return NextResponse.json({ ok: true, recipients: parents.length, postId })
  } catch (err) {
    console.error('/api/staff/programs/board POST', err)
    return NextResponse.json({ error: 'Could not post to class board' }, { status: 500 })
  }
}
