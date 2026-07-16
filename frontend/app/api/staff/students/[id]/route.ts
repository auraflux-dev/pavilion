import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

type StudentRow = {
  _id?: string
  firstName?: string
  lastName?: string
  parentEmail?: string
  archived?: boolean
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    if (typeof body.archived !== 'boolean') {
      return NextResponse.json({ error: 'archived must be true or false' }, { status: 400 })
    }

    const client = getWixClient()
    const student = (await client.items.get('Students', id)) as StudentRow
    if (!student?._id) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    await client.items.update('Students', {
      ...student,
      _id: id,
      archived: body.archived,
      archivedAt: body.archived ? new Date().toISOString() : null,
      archivedBy: body.archived ? session!.email : null,
      autoTopOff: body.archived ? false : (student as { autoTopOff?: boolean }).autoTopOff,
    } as Parameters<typeof client.items.update>[1])

    return NextResponse.json({
      ok: true,
      student: {
        id,
        firstName: student.firstName ?? '',
        lastName: student.lastName ?? '',
        parentEmail: student.parentEmail ?? '',
        archived: body.archived,
      },
    })
  } catch (err) {
    console.error('/api/staff/students/[id] PATCH error:', err)
    return NextResponse.json({ error: 'Could not update student archive status' }, { status: 500 })
  }
}
