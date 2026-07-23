/**
 * GET /api/staff/gmail-send/status. is purchase/outreach email ready?
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { gmailSendReady } from '@/lib/staff/gmail-send-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (
    !requireStaffRole(session?.staff ?? null, [
      'admin',
      'membership',
      'treasurer',
      'programs',
      'secretary',
    ])
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const status = await gmailSendReady()
  return NextResponse.json({
    ...status,
    connectUrl: '/api/staff/workspace/connect',
    preferredSenderHint:
      'Sign in to Staff as membership@shmspto.org (or treasurer@), open Inbox, then Connect Google. That enables purchase confirmation emails.',
  })
}
