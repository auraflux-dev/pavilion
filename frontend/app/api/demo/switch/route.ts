import { NextRequest, NextResponse } from 'next/server'
import { isDemoInstance } from '@/lib/demo/instance'
import { issueDemoReviewResponse } from '@/lib/demo/issue-session'
import type { DemoLane } from '@/lib/demo/session'

export async function POST(req: NextRequest) {
  if (!isDemoInstance()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let lane: DemoLane = 'both'
  let parentKind: 'paid' | 'free' = 'paid'
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

  const next = lane === 'parent' ? '/member-portal' : '/staff'
  return issueDemoReviewResponse({ req, lane, parentKind, next })
}
