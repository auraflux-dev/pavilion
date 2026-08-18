/**
 * GET /api/cron/notify-invite-bounces
 * Scan the sending Gmail mailbox for invite DSNs and notify the household owner
 * (email + Member Portal messages). Auth: Authorization: Bearer $CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server'
import { notifyHouseholdInviteBounces } from '@/lib/staff/invite-bounce-notify'
import { reportError } from '@/lib/observability/error-reporting'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await notifyHouseholdInviteBounces()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/cron/notify-invite-bounces' })
    return NextResponse.json({ error: 'Invite bounce notify failed', eventId }, { status: 500 })
  }
}
