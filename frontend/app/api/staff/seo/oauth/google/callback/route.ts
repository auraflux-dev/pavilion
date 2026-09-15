import { NextRequest, NextResponse } from 'next/server'
import { encryptSecret } from '@/lib/staff/seo/crypto'
import {
  exchangeGoogleCode,
  googleAccessToken,
  listGscSites,
} from '@/lib/staff/seo/google'
import { verifySeoConnectInvite } from '@/lib/staff/seo/invite'
import { loadWorkspaceBundle, upsertIntegration } from '@/lib/staff/seo/store'
import { googleAccountAllowedForWorkspace, type WorkspaceIntegration } from '@/lib/staff/seo/workspace'
import { normalizeCompanyProduct } from '@/lib/crm/platform-owners'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const err = url.searchParams.get('error')
  const code = url.searchParams.get('code')
  const stateRaw = url.searchParams.get('state')

  let workspaceId = 'pavilion'
  let returnPath = '/staff?view=seo'
  let inviteToken: string | null = null

  try {
    if (stateRaw) {
      const state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8')) as {
        workspaceId?: string
        returnPath?: string
        inviteToken?: string | null
      }
      workspaceId = state.workspaceId || workspaceId
      returnPath = state.returnPath || returnPath
      inviteToken = state.inviteToken || null
    }
  } catch {
    /* ignore */
  }

  const dest = new URL(returnPath, url.origin)
  if (err) {
    dest.searchParams.set('oauth', 'error')
    dest.searchParams.set('oauth_error', err)
    return NextResponse.redirect(dest)
  }
  if (!code) {
    dest.searchParams.set('oauth', 'error')
    dest.searchParams.set('oauth_error', 'missing_code')
    return NextResponse.redirect(dest)
  }

  const product = normalizeCompanyProduct(
    workspaceId === 'businessrocket' || workspaceId === 'auraflux' ? workspaceId : 'pavilion',
  )

  try {
    const tokens = await exchangeGoogleCode(code, url.origin)
    if (!tokens.refreshToken) {
      dest.searchParams.set('oauth', 'partial')
      dest.searchParams.set(
        'oauth_error',
        'No refresh_token returned. Disconnect in Google Account and reconnect.',
      )
      return NextResponse.redirect(dest)
    }

    const bundle = await loadWorkspaceBundle(workspaceId, product)
    const invite = inviteToken ? verifySeoConnectInvite(inviteToken) : null
    const allowConfig =
      invite && invite.workspaceId === workspaceId
        ? {
            googleHd: invite.googleHd ?? bundle.config.googleHd,
            allowedGoogleEmails: invite.allowedGoogleEmails?.length
              ? invite.allowedGoogleEmails
              : bundle.config.allowedGoogleEmails,
          }
        : bundle.config
    const allowed = googleAccountAllowedForWorkspace(allowConfig, tokens.email)
    if (!allowed.ok) {
      dest.searchParams.set('oauth', 'error')
      dest.searchParams.set('oauth_error', allowed.reason)
      return NextResponse.redirect(dest)
    }

    const refreshTokenEnc = encryptSecret(tokens.refreshToken)
    const access = await googleAccessToken(refreshTokenEnc)
    const sites = await listGscSites(access)
    const propertyId = sites[0] || null
    const integration: WorkspaceIntegration = {
      tool: 'gsc',
      provider: 'google_direct',
      accountLabel: tokens.email
        ? `${tokens.email} · ${propertyId || 'pick GSC property'}`
        : propertyId
          ? `GSC · ${propertyId}`
          : 'GSC connected. Pick a property.',
      externalAccountId: tokens.email || null,
      propertyId,
      status: 'connected',
      refreshTokenEnc,
      scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/webmasters.readonly'],
      connectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await upsertIntegration(workspaceId, product, integration)

    if (inviteToken || returnPath.startsWith('/seo-connect')) {
      const pickUrl = new URL('/seo-connect', url.origin)
      pickUrl.searchParams.set('oauth', 'connected')
      pickUrl.searchParams.set('sites', sites.slice(0, 40).join('|'))
      pickUrl.searchParams.set('workspaceId', workspaceId)
      return NextResponse.redirect(pickUrl)
    }

    dest.searchParams.set('oauth', 'connected')
    dest.searchParams.set('view', 'seo')
    if (sites.length) dest.searchParams.set('gsc_sites', sites.slice(0, 40).join('|'))
    return NextResponse.redirect(dest)
  } catch (e) {
    dest.searchParams.set('oauth', 'error')
    dest.searchParams.set('oauth_error', e instanceof Error ? e.message : 'oauth_failed')
    return NextResponse.redirect(dest)
  }
}
