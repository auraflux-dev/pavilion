import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { canManageAllPrograms } from '@/lib/staff/roles'
import { ensureSeasonPacket } from '@/lib/programs/ensure-season-packet'
import type { PublicCatalogSeasonId } from '@/lib/programs/season'

function parseSeason(raw: unknown): PublicCatalogSeasonId | null {
  const s = String(raw ?? '').trim()
  if (s === 'fall-2026' || s === 'spring-2027') return s
  return null
}

/**
 * One Staff action for a season packet:
 * create any missing EP classes, then write locked LCPS schedule into CMS rows.
 */
export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session || !requireStaffRole(session.staff, ['admin', 'programs'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!canManageAllPrograms(session.staff)) {
    return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const season = parseSeason((body as { season?: string }).season)
    if (!season) {
      return NextResponse.json(
        { error: 'season must be fall-2026 or spring-2027' },
        { status: 400 },
      )
    }
    const result = await ensureSeasonPacket(season)
    return NextResponse.json(result)
  } catch (err) {
    console.error('/api/staff/programs/ensure-packet POST', err)
    return NextResponse.json({ error: 'Could not ensure season packet' }, { status: 500 })
  }
}
