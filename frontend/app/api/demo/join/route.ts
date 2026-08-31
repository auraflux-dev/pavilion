import { NextRequest, NextResponse } from 'next/server'
import { isSecure } from '@/lib/auth-cookies'
import { normalizeRequestHost } from '@/lib/crm/tenant'
import { isDemoProductHost } from '@/lib/crm/product-host'
import { persistDemoJoin } from '@/lib/crm/persist'
import { DEMO_MEMBER_SINCE_MS } from '@/lib/demo/issue-session'
import {
  DEMO_REVIEW_COOKIE,
  DEMO_REVIEW_MAX_AGE,
  encodeDemoReviewCookie,
  expectedDemoJoinCode,
  joinCodeMatches,
  type DemoLane,
} from '@/lib/demo/session'

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: NextRequest) {
  if (!isDemoProductHost(normalizeRequestHost(req))) {
    return bad('Demo join is only on the review instance.', 404)
  }
  if (!expectedDemoJoinCode()) {
    return bad('Demo join is not configured.', 503)
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return bad('Invalid JSON.')
  }

  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const school = String(body.school ?? '').trim()
  const code = String(body.code ?? '').trim()
  const lane: DemoLane = body.lane === 'parent' ? 'parent' : 'both'
  const parentKind = body.parentKind === 'free' ? 'free' : 'paid'

  if (!firstName || !lastName) return bad('Enter your first and last name.')
  if (!email.includes('@') || !email.includes('.')) return bad('Enter a valid email.')
  if (school.length < 3) return bad('Enter your school or PTO name.')
  if (!joinCodeMatches(code)) return bad('That review code does not match.')

  const token = encodeDemoReviewCookie({
    email,
    firstName,
    lastName,
    school,
    lane,
    parentKind,
    iat: DEMO_MEMBER_SINCE_MS,
  })
  if (!token) {
    return bad('Demo signing is not configured.', 503)
  }

  const next = lane === 'parent' ? '/member-portal' : '/staff'
  const res = NextResponse.json({ ok: true, next })
  await persistDemoJoin({
    req,
    res,
    email,
    firstName,
    lastName,
  })
  res.cookies.set(DEMO_REVIEW_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(),
    path: '/',
    maxAge: DEMO_REVIEW_MAX_AGE,
  })
  return res
}
