import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/staff/session'
import {
  getStaffGoogleAccess,
  workspaceStatusPayload,
} from '@/lib/google/workspace-auth'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  let hasPersonal = false
  try {
    const access = await getStaffGoogleAccess(session.email)
    hasPersonal = Boolean(access)
  } catch {
    hasPersonal = false
  }

  return NextResponse.json(workspaceStatusPayload(session.email, hasPersonal))
}
