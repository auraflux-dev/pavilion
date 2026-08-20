import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/crm/auth'
import { isCommonsPlatformHost } from '@/lib/crm/auth-edge'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { COMMONS_TRIAL_SLUG_COOKIE } from '@/lib/crm/trial-packs/from-cookies'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isCommonsPlatformHost() || !commonsDbEnabled()) {
    return NextResponse.json({ ok: false }, { status: 404 })
  }
  await ensureCommonsReady()
  const auth = getAuth()
  if (!auth) return NextResponse.json({ ok: false }, { status: 503 })
  const session = await auth.api.getSession({ headers: req.headers })
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ ok: false, error: 'Sign in first' }, { status: 401 })

  const found = await sql<{ slug: string }>(
    `select o.slug
       from people p
       join organizations o on o.id = p.organization_id
      where p.auth_user_id = $1
      limit 1`,
    [userId],
  )
  const slug = found.rows[0]?.slug || ''
  if (!slug) return NextResponse.json({ ok: false, error: 'No school on this login' }, { status: 404 })

  const res = NextResponse.json({ ok: true, slug })
  res.cookies.set(COMMONS_TRIAL_SLUG_COOKIE, slug, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 40,
  })
  return res
}
