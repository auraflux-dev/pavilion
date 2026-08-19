import { NextRequest, NextResponse } from 'next/server'
import { isSecure } from '@/lib/auth-cookies'
import { persistDemoJoin } from '@/lib/crm/persist'
import { DEMO_JOIN_PROFILES } from '@/lib/crm/riverside'
import {
  DEMO_REVIEW_COOKIE,
  DEMO_REVIEW_MAX_AGE,
  encodeDemoReviewCookie,
  type DemoLane,
  type DemoParentKind,
  type DemoReviewSession,
} from '@/lib/demo/session'

/** Sample households joined in Sept 2025 — not the click timestamp. */
export const DEMO_MEMBER_SINCE_MS = Date.parse('2025-09-08T12:00:00.000Z')

export function demoIdentity(lane: DemoLane, parentKind: DemoParentKind) {
  if (lane === 'parent' && parentKind === 'free') return DEMO_JOIN_PROFILES.free
  if (lane === 'parent') return DEMO_JOIN_PROFILES.paid
  return DEMO_JOIN_PROFILES.staff
}

export async function issueDemoReviewResponse(opts: {
  req: NextRequest
  lane: DemoLane
  parentKind: DemoParentKind
  next: string
  extraJson?: Record<string, unknown>
  names?: { firstName?: string; lastName?: string; email?: string }
}): Promise<NextResponse> {
  const profile = demoIdentity(opts.lane, opts.parentKind)
  const firstName = opts.names?.firstName?.trim() || profile.firstName
  const lastName = opts.names?.lastName?.trim() || profile.lastName
  const email = (opts.names?.email?.trim() || profile.email).toLowerCase()
  const session: DemoReviewSession = {
    email,
    firstName,
    lastName,
    school: profile.school,
    lane: opts.lane,
    parentKind: opts.parentKind,
    iat: DEMO_MEMBER_SINCE_MS,
  }
  const token = encodeDemoReviewCookie(session)
  const res = NextResponse.json({
    ok: true,
    next: opts.next,
    redirectTo: opts.next,
    lane: opts.lane,
    demo: true,
    ...opts.extraJson,
  })
  if (token) {
    res.cookies.set(DEMO_REVIEW_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure(),
      path: '/',
      maxAge: DEMO_REVIEW_MAX_AGE,
    })
  }
  await persistDemoJoin({
    req: opts.req,
    res,
    email,
    firstName,
    lastName,
  })
  return res
}
