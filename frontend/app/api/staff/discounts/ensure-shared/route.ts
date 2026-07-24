/**
 * Ensure shared enrichment codes exist (SHMSREEF10 / SHMSLAGOON15 / SHMSTIDE30).
 * Staff or admin can POST once after deploy.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { ensureSharedEnrichmentCode } from '@/lib/staff/enrichment-codes'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['membership', 'admin', 'programs'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const codes = await Promise.all([
      ensureSharedEnrichmentCode('reef'),
      ensureSharedEnrichmentCode('lagoon'),
      ensureSharedEnrichmentCode('tide'),
    ])
    return NextResponse.json({
      ok: true,
      codes: codes.filter(Boolean).map((c) => ({ code: c!.code, percent: c!.percent, id: c!.id })),
    })
  } catch (err) {
    console.error('ensure enrichment codes', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not create codes' },
      { status: 500 },
    )
  }
}
