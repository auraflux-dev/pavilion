/**
 * GET /api/cron/send-newsletter-jobs
 * Send approved NewsletterJobs whose sendAt is due.
 * Auth: Authorization: Bearer $CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server'
import { sendDueNewsletterJobs } from '@/lib/staff/newsletter-jobs'
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
    const result = await sendDueNewsletterJobs()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/cron/send-newsletter-jobs' })
    return NextResponse.json({ error: 'Newsletter job send failed', eventId }, { status: 500 })
  }
}
