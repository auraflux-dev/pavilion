import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (
    !requireStaffRole(session?.staff ?? null, [
      'programs',
      'instructor',
      'secretary',
      'membership',
      'admin',
    ])
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const subject = String(body.subject ?? '').trim()
    const message = String(body.body ?? '').trim()
    const parentEmail = String(body.parentEmail ?? '').trim().toLowerCase()
    const grade = String(body.grade ?? '').trim()
    const programName = String(body.programName ?? '').trim()
    const studentId = String(body.studentId ?? '').trim()
    const audience = String(body.audience ?? 'custom').trim() || 'custom'

    if (!subject || !message) {
      return NextResponse.json({ error: 'subject and body are required' }, { status: 400 })
    }
    if (!parentEmail && !grade && !programName && audience !== 'all') {
      return NextResponse.json(
        { error: 'Choose a parent email, grade, program, or audience=all' },
        { status: 400 }
      )
    }

    const client = getWixClient()
    await client.items.insert('ParentMessages', {
      parentEmail: parentEmail || null,
      audience,
      grade: grade || null,
      studentId: studentId || null,
      studentName: String(body.studentName ?? '').trim() || null,
      programName: programName || null,
      fromName: session!.staff.name || session!.staff.boardTitle || session!.email,
      subject,
      body: message,
      sentAt: new Date().toISOString(),
      active: true,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/staff/messages POST error:', err)
    return NextResponse.json({ error: 'Could not send message' }, { status: 500 })
  }
}
