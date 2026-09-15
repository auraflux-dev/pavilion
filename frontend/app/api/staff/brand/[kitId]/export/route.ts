import { NextRequest, NextResponse } from 'next/server'
import { requireBrandStaff } from '@/lib/staff/brand-staff-gate'
import { exportGuidelinesFile } from '@/lib/staff/brand-strategy/types'
import { getKit } from '@/lib/staff/brand-strategy/store'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ kitId: string }> },
) {
  const gated = await requireBrandStaff(req)
  if (!gated.ok) return gated.res
  const { kitId } = await ctx.params
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')?.trim() || gated.gate.workspaceId
  const kit = await getKit(workspaceId, kitId)
  if (!kit) return NextResponse.json({ error: 'Kit not found' }, { status: 404 })
  const markdown = exportGuidelinesFile(kit)
  const filename = `${(kit.inputs.brandName || 'brand').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-guidelines.md`
  return new NextResponse(markdown, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  })
}
