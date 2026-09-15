import { NextRequest, NextResponse } from 'next/server'
import { requireBrandStaff } from '@/lib/staff/brand-staff-gate'
import { loadWorkspaceBundle, publicBundle, saveWorkspaceBundle } from '@/lib/staff/seo/store'
import { createSeoConnectInvite } from '@/lib/staff/seo/invite'
import { googleOAuthBlockedReason } from '@/lib/staff/seo/crypto'
import type { SeoGeoMode } from '@/lib/staff/seo/workspace'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const gated = await requireBrandStaff(req)
  if (!gated.ok) return gated.res
  const bundle = await loadWorkspaceBundle(gated.gate.workspaceId, gated.gate.product)
  return NextResponse.json({
    workspaceId: gated.gate.workspaceId,
    product: gated.gate.product,
    bundle: publicBundle(bundle),
    googleOAuthBlocked: googleOAuthBlockedReason(),
  })
}

export async function POST(req: NextRequest) {
  const gated = await requireBrandStaff(req)
  if (!gated.ok) return gated.res
  const body = (await req.json()) as {
    action?: string
    workspaceId?: string
    domain?: string
    origin?: string
    name?: string
    geoMode?: SeoGeoMode
    locations?: string[]
    googleHd?: string | null
    allowedGoogleEmails?: string[]
    gscSiteUrl?: string | null
  }
  const workspaceId = body.workspaceId?.trim() || gated.gate.workspaceId
  const bundle = await loadWorkspaceBundle(workspaceId, gated.gate.product)

  if (body.action === 'create_invite') {
    const invite = createSeoConnectInvite({
      workspaceId,
      origin: req.nextUrl.origin,
      googleHd: bundle.config.googleHd,
      allowedGoogleEmails: bundle.config.allowedGoogleEmails,
      tools: ['gsc'],
    })
    return NextResponse.json({ invite: { url: invite.url, exp: invite.payload.exp } })
  }

  if (body.action === 'disconnect_gsc') {
    bundle.config.connection.integrations = bundle.config.connection.integrations.filter((i) => i.tool !== 'gsc')
    bundle.config.connection.gscSiteUrl = null
    bundle.config.connection.liveGoogle = bundle.config.connection.integrations.length > 0
    await saveWorkspaceBundle(bundle)
    return NextResponse.json({ bundle: publicBundle(bundle) })
  }

  if (body.action === 'set_property' && body.gscSiteUrl) {
    bundle.config.connection.gscSiteUrl = body.gscSiteUrl
    const gsc = bundle.config.connection.integrations.find((i) => i.tool === 'gsc')
    if (gsc) gsc.propertyId = body.gscSiteUrl
    await saveWorkspaceBundle(bundle)
    return NextResponse.json({ bundle: publicBundle(bundle) })
  }

  if (body.name) bundle.config.name = body.name
  if (body.domain) bundle.config.domain = body.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (body.origin) bundle.config.origin = body.origin.replace(/\/$/, '')
  if (body.geoMode) bundle.config.geoMode = body.geoMode
  if (Array.isArray(body.locations)) bundle.config.locations = body.locations.map(String)
  if (body.googleHd !== undefined) bundle.config.googleHd = body.googleHd
  if (Array.isArray(body.allowedGoogleEmails)) {
    bundle.config.allowedGoogleEmails = body.allowedGoogleEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)
  }
  await saveWorkspaceBundle(bundle)
  return NextResponse.json({ bundle: publicBundle(bundle) })
}
