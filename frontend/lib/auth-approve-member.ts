/**
 * Open parent registration: Wix may leave members PENDING when site
 * “owner must approve” was/is on. Google create already uses APPROVED;
 * email login/register honors Wix LoginState.OWNER_APPROVAL_REQUIRED.
 * Approve PENDING only (never BLOCKED) so parents can reach Member Portal.
 */
import { createClient, ApiKeyStrategy } from '@wix/sdk'
import { members } from '@wix/members'

function adminMembersClient() {
  const siteId = process.env.WIX_SITE_ID?.trim()
  const apiKey = process.env.WIX_API_KEY?.trim()
  if (!siteId || !apiKey) {
    throw new Error('WIX_SITE_ID and WIX_API_KEY must be set')
  }
  return createClient({
    modules: { members },
    auth: ApiKeyStrategy({ siteId, apiKey }),
  })
}

export type ApprovePendingResult =
  | { ok: true; memberId: string; wasPending: true }
  | { ok: true; memberId: string; wasPending: false; status: string }
  | { ok: false; reason: 'not_found' | 'blocked' | 'no_admin' | 'error'; message?: string }

/**
 * If the member exists and is PENDING, approve them.
 * Returns wasPending:false when already APPROVED (or other non-blocked).
 * Does not approve BLOCKED members.
 */
export async function approvePendingMemberByEmail(
  email: string,
): Promise<ApprovePendingResult> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return { ok: false, reason: 'not_found' }

  try {
    if (!process.env.WIX_SITE_ID?.trim() || !process.env.WIX_API_KEY?.trim()) {
      return { ok: false, reason: 'no_admin' }
    }
    const client = adminMembersClient()
    const existing = await client.members
      .queryMembers()
      .eq('loginEmail', normalized)
      .limit(1)
      .find()
    const row = existing.items?.[0] as
      | { _id?: string; status?: string }
      | undefined
    const memberId = row?._id
    if (!memberId) return { ok: false, reason: 'not_found' }

    const status = String(row?.status || '').toUpperCase()
    if (status === 'BLOCKED') {
      return { ok: false, reason: 'blocked' }
    }
    if (status === 'PENDING') {
      await client.members.approveMember(memberId)
      return { ok: true, memberId, wasPending: true }
    }
    return { ok: true, memberId, wasPending: false, status: status || 'UNKNOWN' }
  } catch (err) {
    console.error('approvePendingMemberByEmail', err)
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'approve failed',
    }
  }
}

/** Approve by id when status is PENDING. Safe no-op if already approved. */
export async function approvePendingMemberById(
  memberId: string,
  status?: string,
): Promise<boolean> {
  const id = String(memberId || '').trim()
  if (!id) return false
  const st = String(status || '').toUpperCase()
  if (st === 'BLOCKED') return false
  if (st && st !== 'PENDING') return false
  try {
    const client = adminMembersClient()
    if (!st) {
      const got = await client.members.getMember(id)
      const live = String((got as { status?: string })?.status || '').toUpperCase()
      if (live !== 'PENDING') return false
    }
    await client.members.approveMember(id)
    return true
  } catch (err) {
    console.error('approvePendingMemberById', err)
    return false
  }
}
