/**
 * POST /api/ops/pageview  { path }
 * Anonymous first-party pageview for the Monday traffic digest. No identity stored.
 */
import { NextRequest, NextResponse } from 'next/server'
import { classifyPath, easternDayLabel, recordPageview } from '@/lib/ops/site-traffic'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const COOKIE = 'shms_td'

function parseSeen(raw: string | undefined, day: string): Set<TrafficSurfaceName> {
  if (!raw) return new Set()
  const [cookieDay, list] = raw.split('|')
  if (cookieDay !== day) return new Set()
  return new Set(
    (list || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is TrafficSurfaceName => s === 'website' || s === 'member' || s === 'staff'),
  )
}

type TrafficSurfaceName = 'website' | 'member' | 'staff'

export async function POST(req: NextRequest) {
  const ua = (req.headers.get('user-agent') || '').toLowerCase()
  if (!ua || /bot|crawler|spider|preview|lighthouse/i.test(ua)) {
    return NextResponse.json({ ok: true, skipped: 'bot' })
  }

  const ip = clientIp(req)
  const rl = rateLimit(`pageview:${ip}`, 40, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ ok: true, skipped: 'rate' })
  }

  const body = (await req.json().catch(() => ({}))) as { path?: unknown }
  const path = String(body.path ?? '').trim() || '/'
  const surface = classifyPath(path)
  if (!surface) return NextResponse.json({ ok: true, skipped: 'path' })

  const day = easternDayLabel()
  const seen = parseSeen(req.cookies.get(COOKIE)?.value, day)
  const newVisitor = !seen.has(surface)
  if (newVisitor) seen.add(surface)

  try {
    await recordPageview({ path, newVisitor })
  } catch (err) {
    console.warn('[pageview] record skipped', err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: true, skipped: 'cms' })
  }

  const res = NextResponse.json({ ok: true, surface })
  res.cookies.set({
    name: COOKIE,
    value: `${day}|${[...seen].join(',')}`,
    path: '/',
    maxAge: 60 * 60 * 36,
    sameSite: 'lax',
    httpOnly: true,
    secure: true,
  })
  return res
}
