import { NextRequest, NextResponse } from 'next/server'
import { requireBrandStaff } from '@/lib/staff/brand-staff-gate'
import { buildGoogleAuthUrl } from '@/lib/staff/seo/google'
import { loadWorkspaceBundle } from '@/lib/staff/seo/store'
import { verifySeoConnectInvite } from '@/lib/staff/seo/invite'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const inviteToken = url.searchParams.get('token')
  const origin = url.origin

  if (inviteToken) {
    const invite = verifySeoConnectInvite(inviteToken)
    if (!invite) {
      return NextResponse.redirect(new URL('/seo-connect?oauth=error&oauth_error=invalid_or_expired_invite', origin))
    }
    const started = buildGoogleAuthUrl({
      workspaceId: invite.workspaceId,
      tool: 'gsc',
      returnPath: '/seo-connect',
      googleHd: invite.googleHd,
      inviteToken,
      redirectOrigin: origin,
    })
    if (!started.authUrl) {
      return NextResponse.redirect(
        new URL(
          `/seo-connect?token=${encodeURIComponent(inviteToken)}&oauth=error&oauth_error=${encodeURIComponent(started.message)}`,
          origin,
        ),
      )
    }
    return NextResponse.redirect(started.authUrl)
  }

  const gated = await requireBrandStaff(req)
  if (!gated.ok) return NextResponse.redirect(new URL('/staff', origin))
  const bundle = await loadWorkspaceBundle(gated.gate.workspaceId, gated.gate.product)
  const started = buildGoogleAuthUrl({
    workspaceId: gated.gate.workspaceId,
    tool: 'gsc',
    returnPath: '/staff?view=seo',
    googleHd: bundle.config.googleHd,
    redirectOrigin: origin,
  })
  if (!started.authUrl) {
    return NextResponse.json({ error: started.message, permissionsCopy: started.permissionsCopy }, { status: 400 })
  }
  return NextResponse.redirect(started.authUrl)
}
