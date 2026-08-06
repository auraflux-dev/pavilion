import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { canvaClientConfigured, canvaSharedTokenConfigured, CANVA_MARKETING_FOLDER_URL } from '@/lib/canva/config'
import {
  canvaConnectionAvailable,
  getCanvaAccessTokenForStaff,
  getStaffCanvaRefreshToken,
} from '@/lib/canva/tokens'
import { getCanvaUser } from '@/lib/canva/client'

function canMarketing(session: NonNullable<Awaited<ReturnType<typeof getStaffSession>>>) {
  return requireStaffRole(session.staff, ['marketing', 'admin'])
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !canMarketing(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const clientReady = canvaClientConfigured()
  const sharedReady = canvaSharedTokenConfigured()
  const staffRefresh = await getStaffCanvaRefreshToken(session.email)
  let connected = false
  let mode: string | null = null
  let user: { displayName: string; teamName: string } | null = null
  let error = ''

  if (canvaConnectionAvailable()) {
    try {
      const tok = await getCanvaAccessTokenForStaff(session.email)
      if (tok) {
        connected = true
        mode = tok.mode
        user = await getCanvaUser(tok.accessToken)
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Canva token failed'
    }
  }

  return NextResponse.json({
    clientConfigured: clientReady,
    sharedConfigured: sharedReady,
    staffConnected: Boolean(staffRefresh),
    connected,
    mode,
    user,
    error: error || undefined,
    brandAssetsUrl: '/brand',
    marketingFolderUrl: CANVA_MARKETING_FOLDER_URL,
    setup: {
      redirectUriProd: 'https://www.shmspto.org/api/staff/canva/connect/callback',
      redirectUriLocal: 'http://127.0.0.1:3022/api/staff/canva/connect/callback',
      docs: 'docs/CANVA-SETUP.md',
    },
  })
}
