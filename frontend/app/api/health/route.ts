import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health. UptimeRobot / load balancer probe.
 * Default is a cheap process-alive check (no Wix). Pass ?deep=1 to verify CMS.
 */
export async function GET(req: NextRequest) {
  const started = Date.now()
  const deep = req.nextUrl.searchParams.get('deep') === '1'

  if (!deep) {
    return NextResponse.json(
      {
        ok: true,
        service: 'shmspto',
        ms: Date.now() - started,
        at: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=15' },
      },
    )
  }

  const checks: Record<string, { ok: boolean; ms?: number; error?: string }> = {}
  try {
    const t0 = Date.now()
    const { getWixClient } = await import('@/lib/wix-client')
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
  return NextResponse.json(
    {
      ok,
      service: 'shmspto',
      engine: 'wix-cms',
      checks,
      ms: Date.now() - started,
      at: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  )
}
