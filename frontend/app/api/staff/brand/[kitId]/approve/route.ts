import { NextRequest, NextResponse } from 'next/server'
import { requireBrandStaff } from '@/lib/staff/brand-staff-gate'
import { exportGuidelinesFile } from '@/lib/staff/brand-strategy/types'
import { getKit, updateKit } from '@/lib/staff/brand-strategy/store'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ kitId: string }> },
) {
  const gated = await requireBrandStaff(req)
  if (!gated.ok) return gated.res
  const { kitId } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as { workspaceId?: string }
  const workspaceId = body.workspaceId?.trim() || gated.gate.workspaceId
  const kit = await getKit(workspaceId, kitId)
  if (!kit) return NextResponse.json({ error: 'Kit not found' }, { status: 404 })
  if (!kit.outputJson && !kit.outputMd) {
    return NextResponse.json({ error: 'Generate a strategy before approving' }, { status: 400 })
  }
  const approved = await updateKit(
    workspaceId,
    kitId,
    {
      status: 'approved',
      approvedAt: new Date().toISOString(),
    },
    { snapshotNote: 'approved', createdBy: gated.gate.email },
  )
  if (!approved) return NextResponse.json({ error: 'Approve failed' }, { status: 500 })
  const markdown = exportGuidelinesFile(approved)
  return NextResponse.json({ kit: approved, markdown, filename: 'brand-guidelines.md' })
}
