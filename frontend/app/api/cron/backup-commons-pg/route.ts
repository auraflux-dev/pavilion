/**
 * GET /api/cron/backup-commons-pg
 * Nightly encrypted Commons Postgres dump → R2 commons/.
 */
import { NextRequest, NextResponse } from 'next/server'
import { runCommonsPgBackup } from '@/lib/ops/commons-pg-backup'
import { reportError } from '@/lib/observability/error-reporting'
import { isDemoInstance } from '@/lib/demo/instance'
import { ensureCommonsReady } from '@/lib/crm/migrate'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

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
  if (!isDemoInstance() && process.env.COMMONS_PLATFORM !== 'true') {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Not a Commons project' })
  }

  try {
    await ensureCommonsReady()
    const result = await runCommonsPgBackup()
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/cron/backup-commons-pg' })
    return NextResponse.json({ error: 'Commons backup failed', eventId }, { status: 500 })
  }
}
