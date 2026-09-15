import { NextRequest, NextResponse } from 'next/server'
import { verifySeoConnectInvite } from '@/lib/staff/seo/invite'

export const runtime = 'nodejs'

/** Public peek. No tokens. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || ''
  const invite = token ? verifySeoConnectInvite(token) : null
  if (!invite) {
    return NextResponse.json({ error: 'invalid_or_expired_invite' }, { status: 400 })
  }
  return NextResponse.json({
    workspaceId: invite.workspaceId,
    tools: invite.tools,
    googleHd: invite.googleHd,
    exp: invite.exp,
  })
}
