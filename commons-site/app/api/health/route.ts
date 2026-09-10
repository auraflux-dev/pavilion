import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health. UptimeRobot / load balancer probe for onpavilion.com.
 * Default is process-alive. Pass ?deep=1 to ping commons-prod Postgres.
 */
export async function GET(req: Request) {
  const started = Date.now()
  const url = new URL(req.url)
  const deep = url.searchParams.get('deep') === '1'

  if (!deep) {
    return NextResponse.json(
      {
        ok: true,
        service: 'commons-site',
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
    const { getPool, ensureSubscriptionsSchema } = await import('@/lib/db')
    await ensureSubscriptionsSchema()
    await getPool().query('select 1 as ok')
    checks.postgres = { ok: true, ms: Date.now() - t0 }
  } catch (err) {
    checks.postgres = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  const ok = Object.values(checks).every((c) => c.ok)
  return NextResponse.json(
    {
      ok,
      service: 'commons-site',
      checks,
      ms: Date.now() - started,
      at: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  )
}
