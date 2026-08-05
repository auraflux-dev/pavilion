/**
 * Per-staff Canva Connect tokens (StaffCanvaTokens CMS),
 * plus optional shared env refresh/access for an org mailbox.
 */
import { getWixClient } from '@/lib/wix-client'
import { canvaClientConfigured, canvaSharedTokenConfigured } from '@/lib/canva/config'
import { refreshCanvaAccessToken } from '@/lib/canva/oauth'

type TokenRow = {
  _id?: string
  email?: string
  refreshToken?: string
  accessToken?: string
  accessExpiresAt?: string
  active?: boolean
}

export async function getStaffCanvaRefreshToken(email: string): Promise<string | null> {
  try {
    const client = getWixClient()
    const result = await client.items
      .query('StaffCanvaTokens')
      .eq('email', email.trim().toLowerCase())
      .eq('active', true)
      .limit(1)
      .find()
    const row = result.items?.[0] as TokenRow | undefined
    const token = String(row?.refreshToken ?? '').trim()
    return token || null
  } catch {
    return null
  }
}

export async function upsertStaffCanvaTokens(
  email: string,
  tokens: { refreshToken?: string; accessToken?: string; expiresIn?: number },
) {
  const client = getWixClient()
  const normalized = email.trim().toLowerCase()
  const existing = await client.items.query('StaffCanvaTokens').eq('email', normalized).limit(1).find()
  const found = existing.items?.[0] as TokenRow | undefined
  const expiresAt =
    tokens.expiresIn && tokens.accessToken
      ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
      : found?.accessExpiresAt
  const payload = {
    email: normalized,
    refreshToken: tokens.refreshToken || found?.refreshToken || '',
    accessToken: tokens.accessToken || '',
    accessExpiresAt: expiresAt || '',
    active: true,
    updatedAt: new Date().toISOString(),
  }
  if (found?._id) {
    await client.items.update('StaffCanvaTokens', { ...found, ...payload, _id: found._id })
  } else {
    await client.items.insert('StaffCanvaTokens', payload)
  }
}

export async function clearStaffCanvaTokens(email: string) {
  const client = getWixClient()
  const normalized = email.trim().toLowerCase()
  const existing = await client.items.query('StaffCanvaTokens').eq('email', normalized).limit(1).find()
  const found = existing.items?.[0] as TokenRow | undefined
  if (!found?._id) return
  await client.items.update('StaffCanvaTokens', {
    ...found,
    _id: found._id,
    active: false,
    accessToken: '',
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Resolve a usable access token for this staffer.
 * Prefer their StaffCanvaTokens refresh; fall back to shared env tokens.
 */
export async function getCanvaAccessTokenForStaff(email: string): Promise<{
  accessToken: string
  mode: 'staff' | 'shared-refresh' | 'shared-access'
} | null> {
  const staffRefresh = await getStaffCanvaRefreshToken(email)
  if (staffRefresh && canvaClientConfigured()) {
    const refreshed = await refreshCanvaAccessToken(staffRefresh)
    if (refreshed.refresh_token && refreshed.refresh_token !== staffRefresh) {
      await upsertStaffCanvaTokens(email, {
        refreshToken: refreshed.refresh_token,
        accessToken: refreshed.access_token,
        expiresIn: refreshed.expires_in,
      })
    } else {
      await upsertStaffCanvaTokens(email, {
        accessToken: refreshed.access_token,
        expiresIn: refreshed.expires_in,
      })
    }
    return { accessToken: refreshed.access_token, mode: 'staff' }
  }

  const sharedRefresh = process.env.CANVA_REFRESH_TOKEN?.trim()
  if (sharedRefresh && canvaClientConfigured()) {
    const refreshed = await refreshCanvaAccessToken(sharedRefresh)
    return { accessToken: refreshed.access_token, mode: 'shared-refresh' }
  }

  const sharedAccess = process.env.CANVA_ACCESS_TOKEN?.trim()
  if (sharedAccess) {
    return { accessToken: sharedAccess, mode: 'shared-access' }
  }

  return null
}

export function canvaConnectionAvailable(): boolean {
  return canvaClientConfigured() || canvaSharedTokenConfigured()
}
