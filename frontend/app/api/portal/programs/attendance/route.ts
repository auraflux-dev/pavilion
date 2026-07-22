/**
 * GET /api/portal/programs/attendance — parent view of CICO marks
 */
import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveParentEmail } from '@/lib/staff/session'
import { listAttendanceForParentEmail } from '@/lib/programs/attendance'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const effective = await getEffectiveParentEmail(req)
  if (!effective) return NextResponse.json({ error: 'Log in required' }, { status: 401 })

  try {
    const marks = await listAttendanceForParentEmail(effective.parentEmail)
    return NextResponse.json({
      attendance: marks.map((m) => ({
        id: m._id ?? '',
        programId: m.programId ?? '',
        programName: m.programName ?? '',
        sessionDate: m.sessionDate ?? '',
        studentId: m.studentId ?? '',
        studentName: m.studentName ?? '',
        status: m.status ?? '',
        checkedInAt: m.checkedInAt ?? null,
        checkedOutAt: m.checkedOutAt ?? null,
        notes: m.notes ?? '',
      })),
    })
  } catch (err) {
    console.error('portal attendance GET', err)
    return NextResponse.json({ attendance: [] })
  }
}
