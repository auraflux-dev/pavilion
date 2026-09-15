import { NextRequest, NextResponse } from 'next/server'
import { requireBrandStaff } from '@/lib/staff/brand-staff-gate'
import { getActiveKit, getKit, listKits } from '@/lib/staff/brand-strategy/store'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const gated = await requireBrandStaff(req)
  if (!gated.ok) return gated.res
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')?.trim() || gated.gate.workspaceId
  const kitId = req.nextUrl.searchParams.get('kitId')
  if (kitId) {
    const kit = await getKit(workspaceId, kitId)
    if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ kit })
  }
  if (req.nextUrl.searchParams.get('list') === '1') {
    const kits = await listKits(workspaceId)
    return NextResponse.json({ kits, workspaceId })
  }
  const kit = await getActiveKit(workspaceId)
  return NextResponse.json({
    workspaceId,
    kit,
    hasActive: Boolean(kit),
  })
}
