import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/staff/session'
import { getMergedKbArticles, getMergedKbCategories } from '@/lib/api/kb-articles'
import { articlesByCategoryWithExtras, type KbAudience } from '@/lib/kb'
import { isMemberTokens, parseTokensCookie } from '@/lib/auth'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'

/**
 * GET /api/kb?audience=member|staff
 * Member audience: any signed-in member. Staff audience: staff session only.
 */
export async function GET(req: NextRequest) {
  const audience = (req.nextUrl.searchParams.get('audience') || '').trim() as KbAudience
  if (audience !== 'member' && audience !== 'staff') {
    return NextResponse.json({ error: 'audience must be member or staff' }, { status: 400 })
  }

  if (audience === 'staff') {
    const session = await getStaffSession(req)
    if (!session) {
      return NextResponse.json({ error: 'Staff sign-in required' }, { status: 401 })
    }
  } else {
    const tokens = parseTokensCookie(req.cookies.get(TOKENS_COOKIE)?.value)
    if (!isMemberTokens(tokens)) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
  }

  const articles = await getMergedKbArticles(audience)
  const categories = await getMergedKbCategories(audience)
  const groups = articlesByCategoryWithExtras(audience, articles)

  return NextResponse.json({ audience, categories, articles, groups })
}
