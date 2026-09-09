/**
 * GET /api/cron/volunteer-nudge
 * Auto-nudge open volunteer signup sheets (portal inbox). Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { nudgeOpenSignupSheets } from '@/lib/signups/nudge'
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
  if (!commonsDbEnabled()) {
    return NextResponse.json({ ok: true, skipped: 'no commons db' })
  }

  try {
    // Only orgs that already have a published signup sheet (no fleet-wide blast).
    const orgs = await sql<{ id: string }>(
      `select distinct organization_id as id
         from signup_sheets
        where status = 'published'
        limit 40`,
    )
    const byOrg: Record<string, unknown> = {}
    for (const org of orgs.rows) {
      const results = await nudgeOpenSignupSheets(org.id, {
        fromName: 'PTO Volunteers',
        force: false,
      })
      byOrg[org.id] = {
        nudged: results.filter((r) => r.nudged).length,
        results,
      }
    }
    return NextResponse.json({ ok: true, orgs: byOrg })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/cron/volunteer-nudge' })
    return NextResponse.json({ error: 'Volunteer nudge failed', eventId }, { status: 500 })
  }
}
