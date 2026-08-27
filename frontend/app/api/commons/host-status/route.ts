/**
 * GET /api/commons/host-status — Host → tenant plan (no secrets).
 * Used by Edge middleware to hard-gate locked trial vanity hosts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { commonsDbEnabled } from '@/lib/crm/db'
import { writesAllowed } from '@/lib/crm/org-plan'
import { organizationFromHostHeader } from '@/lib/crm/tenant'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!commonsDbEnabled()) {
    return NextResponse.json({ matched: false })
  }
  try {
    const org = await organizationFromHostHeader(req)
    if (!org) return NextResponse.json({ matched: false })
    return NextResponse.json({
      matched: true,
      plan: org.plan,
      writesAllowed: writesAllowed(org.plan, org.trialEndsAt),
      locked: org.plan === 'locked' || !writesAllowed(org.plan, org.trialEndsAt),
    })
  } catch {
    return NextResponse.json({ matched: false })
  }
}
