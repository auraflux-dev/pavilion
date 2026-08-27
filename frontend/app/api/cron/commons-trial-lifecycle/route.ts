import { NextRequest, NextResponse } from 'next/server'
import { runTrialLifecycle } from '@/lib/crm/trial-lifecycle'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { isDemoInstance } from '@/lib/demo/instance'
import { isPavilionProductPlatform } from '@/lib/crm/platform-env'
import { reportError } from '@/lib/observability/error-reporting'

export const dynamic = 'force-dynamic'

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (req.headers.get('authorization') || '') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isDemoInstance() && !isPavilionProductPlatform()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Not a Pavilion product project' })
  }
  try {
    await ensureCommonsReady()
    const result = await runTrialLifecycle()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/cron/commons-trial-lifecycle' })
    return NextResponse.json({ error: 'Trial lifecycle failed', eventId }, { status: 500 })
  }
}
