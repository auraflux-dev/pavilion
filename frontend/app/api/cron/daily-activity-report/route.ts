/**
 * GET /api/cron/daily-activity-report
 * Email yesterday’s website, member portal, and staff activity at 6am Eastern.
 * Auth: Authorization: Bearer $CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server'
import { sendDailyActivityReport } from '@/lib/ops/daily-activity-report'
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
    const result = await sendDailyActivityReport()
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/cron/daily-activity-report' })
    return NextResponse.json({ error: 'Daily activity report failed', eventId }, { status: 500 })
  }
}
