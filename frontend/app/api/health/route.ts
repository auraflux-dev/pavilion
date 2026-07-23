import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health. UptimeRobot / load balancer probe.
 * Returns 200 when the app process and Wix CMS credentials respond.
 */
export async function GET(_req: NextRequest) {
  const started = Date.now()
  const checks: Record<string, { ok: boolean; ms?: number; error?: string }> = {}

  try {
    const t0 = Date.now()
    const client = getWixClient()
    await client.items.query('SiteSettings').limit(1).find()
    checks.wixCms = { ok: true, ms: Date.now() - t0 }
  } catch (err) {
    checks.wixCms = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  const ok = Object.values(checks).every((c) => c.ok)
  const body = {
    ok,
    service: 'shmspto',
    engine: 'wix-cms',
    sqlite: false,
    errorReporting: ['1', 'true', 'yes', 'on'].includes(
      (process.env.ERROR_REPORTING_ENABLED || '').trim().toLowerCase(),
    ),
    checks,
    ms: Date.now() - started,
    at: new Date().toISOString(),
  }

  return NextResponse.json(body, { status: ok ? 200 : 503 })
}
