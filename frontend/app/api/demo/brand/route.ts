/**
 * POST /api/demo/brand  { slug: 'spring-hill' | '' }
 * GET  /api/demo/brand  → { slug, packs: [...] }
 *
 * Sets pavilion_brand cookie on the demo app so a prospect PTO skin
 * rides the same commons-pto-demo deploy (no second trial project).
 */
import { NextRequest, NextResponse } from 'next/server'
import { PAVILION_BRAND_COOKIE } from '@/lib/crm/active-trial'
import { knownTrialPackSlugs, trialPackForSlug } from '@/lib/crm/trial-packs'
import { isDemoInstance } from '@/lib/demo/instance'

export const dynamic = 'force-dynamic'

const MAX_AGE = 60 * 60 * 24 * 30

function packsPublic() {
  return knownTrialPackSlugs().map((slug) => {
    const pack = trialPackForSlug(slug)
    return {
      slug,
      school: pack?.brand.school || slug,
      pto: pack?.brand.pto || slug,
      town: pack?.brand.town || '',
    }
  })
}

function requestHost(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-host')?.split(',')[0]?.trim().toLowerCase().split(':')[0] ||
    req.headers.get('host')?.trim().toLowerCase().split(':')[0] ||
    ''
  )
}

export async function GET(req: NextRequest) {
  if (!isDemoInstance(requestHost(req))) {
    return NextResponse.json({ error: 'Demo only' }, { status: 404 })
  }
  const slug = (req.cookies.get(PAVILION_BRAND_COOKIE)?.value || '').trim().toLowerCase()
  return NextResponse.json({
    slug: slug || null,
    packs: packsPublic(),
    note: 'Default with no pack is Riverside sample demo. Pick a pack to brand this tour as a prospect PTO.',
  })
}

export async function POST(req: NextRequest) {
  if (!isDemoInstance(requestHost(req))) {
    return NextResponse.json({ error: 'Demo only' }, { status: 404 })
  }
  const body = (await req.json().catch(() => ({}))) as { slug?: string }
  const raw = String(body.slug ?? '').trim().toLowerCase()
  const res = NextResponse.json({
    ok: true,
    slug: raw || null,
    next: '/',
  })

  if (!raw) {
    res.cookies.set(PAVILION_BRAND_COOKIE, '', {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return res
  }

  if (!trialPackForSlug(raw)) {
    return NextResponse.json(
      { error: `Unknown brand pack: ${raw}` },
      { status: 400 },
    )
  }

  res.cookies.set(PAVILION_BRAND_COOKIE, raw, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
  return res
}
