import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { clearStaffCanvaTokens } from '@/lib/canva/tokens'

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !requireStaffRole(session.staff, ['marketing', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    await clearStaffCanvaTokens(session.email)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not disconnect' },
      { status: 500 },
    )
  }
}
