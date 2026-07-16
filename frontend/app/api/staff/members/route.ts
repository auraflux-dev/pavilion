import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const q = String(req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase()
  if (q.length < 2) {
    return NextResponse.json({ error: 'Enter at least 2 characters' }, { status: 400 })
  }

  try {
    const client = getWixClient()
    const result = await client.items.query('Students').limit(100).find()
    const byEmail = new Map<
      string,
      {
        parentEmail: string
        students: { id: string; firstName: string; lastName: string; grade: string; membershipTier: string; archived: boolean }[]
      }
    >()

    for (const item of result.items ?? []) {
      const s = item as {
        _id?: string
        parentEmail?: string
        firstName?: string
        lastName?: string
        grade?: string
        membershipTier?: string
        archived?: boolean
      }
      const parentEmail = String(s.parentEmail ?? '').trim().toLowerCase()
      if (!parentEmail) continue
      const hay = `${parentEmail} ${s.firstName ?? ''} ${s.lastName ?? ''}`.toLowerCase()
      if (!hay.includes(q)) continue
      const entry = byEmail.get(parentEmail) ?? { parentEmail, students: [] }
      entry.students.push({
        id: s._id ?? '',
        firstName: s.firstName ?? '',
        lastName: s.lastName ?? '',
        grade: s.grade ?? '',
        membershipTier: s.membershipTier ?? 'free',
        archived: s.archived === true,
      })
      byEmail.set(parentEmail, entry)
    }

    return NextResponse.json({
      members: Array.from(byEmail.values()).slice(0, 40),
    })
  } catch (err) {
    console.error('/api/staff/members GET error:', err)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
