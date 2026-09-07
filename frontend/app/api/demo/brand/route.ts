/**
 * POST /api/demo/brand  { slug: 'vanilla' | '' }
 * GET  /api/demo/brand  → { slug, packs: [...] }
 *
 * Sets pavilion_brand cookie on the demo app for public preview skins only.
 * Named prospect packs (spring-hill, etc.) are not settable on the public demo.
 */
import { NextRequest, NextResponse } from 'next/server'
import { PAVILION_BRAND_COOKIE } from '@/lib/crm/active-trial'
import { isDemoPublicBrandSlug } from '@/lib/crm/demo-public-brands'
import { demoPickerPackSlugs, trialPackForSlug } from '@/lib/crm/trial-packs'
import { isDemoInstance } from '@/lib/demo/instance'

export const dynamic = 'force-dynamic'

const MAX_AGE = 60 * 60 * 24 * 30

function packsPublic() {
  return demoPickerPackSlugs().map((slug) => {
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

function clearBrandCookie(res: NextResponse) {
  res.cookies.set(PAVILION_BRAND_COOKIE, '', {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function GET(req: NextRequest) {
  if (!isDemoInstance(requestHost(req))) {
    return NextResponse.json({ error: 'Demo only' }, { status: 404 })
  }
  const raw = (req.cookies.get(PAVILION_BRAND_COOKIE)?.value || '').trim().toLowerCase()
  const slug = raw && isDemoPublicBrandSlug(raw) ? raw : ''
  const res = NextResponse.json({
    slug: slug || null,
    packs: packsPublic(),
    note: 'Default is Riverside. Public demo only offers an unbranded preview. Named prospect packs are not on this host.',
  })
  // Drop leftover Spring Hill (or other) cookies from older tours.
  if (raw && !slug) clearBrandCookie(res)
  return res
}

export async function POST(req: NextRequest) {
  if (!isDemoInstance(requestHost(req))) {
    return NextResponse.json({ error: 'Demo only' }, { status: 404 })
  }
  const body = (await req.json().catch(() => ({}))) as { slug?: string }
  const raw = String(body.slug ?? '').trim().toLowerCase()

  if (!raw) {
    const res = NextResponse.json({ ok: true, slug: null, next: '/' })
    clearBrandCookie(res)
    return res
  }

  if (!isDemoPublicBrandSlug(raw) || !trialPackForSlug(raw)) {
    return NextResponse.json(
      { error: `Brand pack not available on the public demo: ${raw}` },
      { status: 400 },
    )
  }

  const res = NextResponse.json({
    ok: true,
    slug: raw,
    next: '/',
  })
  res.cookies.set(PAVILION_BRAND_COOKIE, raw, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
  return res
}
