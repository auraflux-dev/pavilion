/**
 * GET /api/staff/activity-log?category=auth&sinceHours=48
 * Platform activity feed (auth-first). Redacted identity only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRoleOrWorkspace } from '@/lib/staff/session'
import { listPlatformActivity } from '@/lib/ops/platform-activity'
import { organizationIdFromRequest } from '@/lib/crm/tenant'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (
    !requireStaffRoleOrWorkspace(
      session?.staff ?? null,
      ['admin', 'membership'],
      ['activity'],
    )
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const category = (req.nextUrl.searchParams.get('category') || 'auth').trim() || 'auth'
  const sinceRaw = Number(req.nextUrl.searchParams.get('sinceHours') || '48')
  const sinceHours = [24, 48, 72, 168].includes(sinceRaw) ? sinceRaw : 48
  const sinceIso = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString()

  let organizationId: string | undefined
  try {
    organizationId = await organizationIdFromRequest(req)
  } catch {
    organizationId = undefined
  }

  const items = await listPlatformActivity({
    category,
    sinceIso,
    limit: 200,
    organizationId,
  })

  return NextResponse.json({
    ok: true,
    category,
    sinceHours,
    sinceIso,
    items,
  })
}
