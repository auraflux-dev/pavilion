import { NextRequest, NextResponse } from 'next/server'
import { isSecure } from '@/lib/auth-cookies'
import { isDemoInstance } from '@/lib/demo/instance'
import {
  DEMO_REVIEW_COOKIE,
  DEMO_REVIEW_MAX_AGE,
  encodeDemoReviewCookie,
  getDemoReviewSession,
  type DemoLane,
} from '@/lib/demo/session'

export async function POST(req: NextRequest) {
  if (!isDemoInstance()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const current = getDemoReviewSession(req)
  if (!current) {
    return NextResponse.json({ error: 'Join the demo first.' }, { status: 401 })
  }

  let lane: DemoLane = current.lane
  let parentKind = current.parentKind || 'paid'
  try {
    const body = (await req.json()) as { lane?: string; parentKind?: string }
    if (body.lane === 'parent' || body.lane === 'staff' || body.lane === 'both') {
      lane = body.lane
    }
    if (body.parentKind === 'free' || body.parentKind === 'paid') {
      parentKind = body.parentKind
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const token = encodeDemoReviewCookie({ ...current, lane, parentKind })
  const next = lane === 'parent' ? '/member-portal' : '/staff'
  const res = NextResponse.json({ ok: true, next, lane })
  res.cookies.set(DEMO_REVIEW_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(),
    path: '/',
    maxAge: DEMO_REVIEW_MAX_AGE,
  })
  return res
}
