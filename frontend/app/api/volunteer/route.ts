import { NextRequest, NextResponse } from 'next/server'
import { submitVolunteerForm } from '@/lib/api/volunteers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { firstName, lastName, email, phone, opportunity, notes } = body

    if (!firstName || !lastName || !email || !opportunity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await submitVolunteerForm({ firstName, lastName, email, phone, opportunity, notes })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  }
}
