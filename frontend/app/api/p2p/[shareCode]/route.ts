import { NextRequest, NextResponse } from 'next/server'
import { getP2pPageByShareCode, resolveP2pOrgId } from '@/lib/p2p/store'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ shareCode: string }> },
) {
  const { shareCode } = await ctx.params
  const orgId = await resolveP2pOrgId(req)
  if (!orgId) return NextResponse.json({ page: null })
  const page = await getP2pPageByShareCode(orgId, shareCode)
  return NextResponse.json({ page })
}
