/**
 * GET /api/cron/backup-cms
 * Nightly full Wix CMS JSON backup → Cloudflare R2.
 * Auth: Authorization: Bearer $CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server'
import { runCmsBackup } from '@/lib/ops/cms-backup'
import { reportError } from '@/lib/observability/error-reporting'

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

  try {
    const result = await runCmsBackup()
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/cron/backup-cms' })
    return NextResponse.json({ error: 'Backup failed', eventId }, { status: 500 })
  }
}
