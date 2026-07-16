/**
 * PATCH /api/students/[id] — parent edits their own student (name, grade).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getWixClient } from '@/lib/wix-client'

type StudentRow = {
  _id?: string
  parentEmail?: string
  firstName?: string
  lastName?: string
  grade?: string
  membershipTier?: string
  membershipStatus?: string
  discountCode?: string | null
  storeCardBalance?: number
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const body = await req.json()
    const firstName = String(body.firstName ?? '').trim()
    const lastName = String(body.lastName ?? '').trim()
    const grade = String(body.grade ?? '').trim()

    if (!firstName || !lastName || !grade) {
      return NextResponse.json({ error: 'firstName, lastName, and grade are required' }, { status: 400 })
    }

    const adminClient = getWixClient()
    const student = (await adminClient.items.get('Students', id)) as StudentRow
    if (!student || (student as StudentRow & { archived?: boolean }).archived === true || student.parentEmail?.toLowerCase() !== session.email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await adminClient.items.update('Students', {
      ...student,
      _id: id,
      firstName,
      lastName,
      grade,
    } as Parameters<typeof adminClient.items.update>[1])

    return NextResponse.json({
      student: {
        id,
        firstName,
        lastName,
        grade,
        membershipTier: student.membershipTier ?? 'free',
        membershipStatus: student.membershipStatus ?? 'active',
        discountCode: student.discountCode ?? null,
        storeCardBalance: student.storeCardBalance ?? 0,
      },
    })
  } catch (err) {
    console.error('/api/students/[id] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }
}
