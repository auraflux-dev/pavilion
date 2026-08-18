/**
 * Household adult sharing (spouse, co-parent, or guardian).
 * Students stay owned by primaryParentEmail (first account holder);
 * additional adults get portal view of the same kids.
 * Cove membership + family code stay on the primary login unless they buy separately.
 */
import { createHash, randomBytes } from 'node:crypto'
import { getWixClient } from '@/lib/wix-client'
import type { FamilyStudentCardRow } from '@/lib/family-store-card'

export const FAMILY_GUARDIANS_COLLECTION = 'FamilyGuardians'

export type GuardianStatus = 'pending' | 'active' | 'revoked'

export type FamilyGuardianRow = {
  _id?: string
  primaryParentEmail?: string
  guardianEmail?: string
  status?: string
  inviteTokenHash?: string
  inviteExpiresAt?: string
  invitedAt?: string
  acceptedAt?: string
  invitedByName?: string
  active?: boolean
  bounceNotifiedAt?: string
}

function norm(email: string): string {
  return email.trim().toLowerCase()
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function makeInviteToken(): string {
  return randomBytes(24).toString('base64url')
}

export async function listGuardianRowsForPrimary(
  primaryParentEmail: string,
): Promise<FamilyGuardianRow[]> {
  const email = norm(primaryParentEmail)
  if (!email) return []
  try {
    const client = getWixClient()
    const result = await client.items
      .query(FAMILY_GUARDIANS_COLLECTION)
      .eq('primaryParentEmail', email)
      .limit(50)
      .find()
    return (result.items ?? []) as FamilyGuardianRow[]
  } catch {
    return []
  }
}

export async function listPendingGuardianInvites(): Promise<FamilyGuardianRow[]> {
  try {
    const client = getWixClient()
    const result = await client.items
      .query(FAMILY_GUARDIANS_COLLECTION)
      .eq('status', 'pending')
      .limit(100)
      .find()
    return ((result.items ?? []) as FamilyGuardianRow[]).filter((r) => r.active !== false)
  } catch {
    return []
  }
}

export async function markGuardianBounceNotified(row: FamilyGuardianRow): Promise<void> {
  if (!row._id) return
  const client = getWixClient()
  await client.items.update(FAMILY_GUARDIANS_COLLECTION, {
    ...row,
    _id: row._id,
    bounceNotifiedAt: new Date().toISOString(),
  })
}

export async function listActiveGuardianLinksForEmail(
  guardianEmail: string,
): Promise<FamilyGuardianRow[]> {
  const email = norm(guardianEmail)
  if (!email) return []
  try {
    const client = getWixClient()
    const result = await client.items
      .query(FAMILY_GUARDIANS_COLLECTION)
      .eq('guardianEmail', email)
      .eq('status', 'active')
      .limit(20)
      .find()
    return ((result.items ?? []) as FamilyGuardianRow[]).filter((r) => r.active !== false)
  } catch {
    return []
  }
}

/** Primary household email for Cove / membership: self, or primary if this login is a guardian. */
export async function resolvePrimaryParentEmail(viewerEmail: string): Promise<string> {
  const email = norm(viewerEmail)
  if (!email) return ''
  const links = await listActiveGuardianLinksForEmail(email)
  const primary = norm(String(links[0]?.primaryParentEmail ?? ''))
  return primary || email
}

/** All household primary emails this viewer can see (own + guardianships). */
export async function listVisiblePrimaryEmails(viewerEmail: string): Promise<string[]> {
  const email = norm(viewerEmail)
  const set = new Set<string>()
  if (email) set.add(email)
  for (const link of await listActiveGuardianLinksForEmail(email)) {
    const p = norm(String(link.primaryParentEmail ?? ''))
    if (p) set.add(p)
  }
  return [...set]
}

export async function listStudentsForViewer(viewerEmail: string): Promise<FamilyStudentCardRow[]> {
  const primaries = await listVisiblePrimaryEmails(viewerEmail)
  const client = getWixClient()
  const byId = new Map<string, FamilyStudentCardRow>()
  for (const primary of primaries) {
    try {
      const result = await client.items.query('Students').eq('parentEmail', primary).limit(100).find()
      for (const row of (result.items ?? []) as FamilyStudentCardRow[]) {
        if (row.archived === true) continue
        if (row._id) byId.set(row._id, row)
      }
    } catch {
      // continue
    }
  }
  return [...byId.values()]
}

export async function canViewerAccessStudent(
  viewerEmail: string,
  student: { parentEmail?: string; archived?: boolean },
): Promise<boolean> {
  if (!student || student.archived === true) return false
  const email = norm(viewerEmail)
  const owner = norm(String(student.parentEmail ?? ''))
  if (!email || !owner) return false
  if (email === owner) return true
  const links = await listActiveGuardianLinksForEmail(email)
  return links.some((l) => norm(String(l.primaryParentEmail ?? '')) === owner)
}

/** True if viewer owns the household (not merely a guardian). */
export async function isHouseholdPrimary(viewerEmail: string, primaryParentEmail: string): Promise<boolean> {
  return norm(viewerEmail) === norm(primaryParentEmail)
}

export async function createGuardianInvite(opts: {
  primaryParentEmail: string
  guardianEmail: string
  invitedByName?: string
  expiresInDays?: number
}): Promise<{ token: string; rowId: string; expiresAt: string }> {
  const primary = norm(opts.primaryParentEmail)
  const guardian = norm(opts.guardianEmail)
  if (!primary || !guardian) throw new Error('Emails required')
  if (primary === guardian) throw new Error('Use a different email for the other adult')
  if (!guardian.includes('@') || guardian.startsWith('@')) throw new Error('Enter a valid email')

  const client = getWixClient()
  const existing = await client.items
    .query(FAMILY_GUARDIANS_COLLECTION)
    .eq('primaryParentEmail', primary)
    .eq('guardianEmail', guardian)
    .limit(5)
    .find()

  for (const row of (existing.items ?? []) as FamilyGuardianRow[]) {
    if (row.status === 'active' && row.active !== false) {
      throw new Error('That email is already linked to this household')
    }
  }

  const token = makeInviteToken()
  const expiresAt = new Date(
    Date.now() + (opts.expiresInDays ?? 14) * 24 * 60 * 60 * 1000,
  ).toISOString()
  const payload = {
    primaryParentEmail: primary,
    guardianEmail: guardian,
    status: 'pending' as const,
    inviteTokenHash: hashInviteToken(token),
    inviteExpiresAt: expiresAt,
    invitedAt: new Date().toISOString(),
    acceptedAt: '',
    invitedByName: String(opts.invitedByName ?? '').trim(),
    active: true,
  }

  const pending = (existing.items ?? []).find(
    (r) => String((r as FamilyGuardianRow).status) === 'pending',
  ) as FamilyGuardianRow | undefined

  if (pending?._id) {
    await client.items.update(FAMILY_GUARDIANS_COLLECTION, {
      ...pending,
      ...payload,
      _id: pending._id,
    })
    return { token, rowId: pending._id, expiresAt }
  }

  const inserted = await client.items.insert(FAMILY_GUARDIANS_COLLECTION, payload)
  const id = String((inserted as { _id?: string })._id ?? '')
  return { token, rowId: id, expiresAt }
}

export async function acceptGuardianInvite(opts: {
  token: string
  acceptingEmail: string
}): Promise<{ primaryParentEmail: string }> {
  const email = norm(opts.acceptingEmail)
  const hash = hashInviteToken(opts.token)
  const client = getWixClient()

  const result = await client.items
    .query(FAMILY_GUARDIANS_COLLECTION)
    .eq('inviteTokenHash', hash)
    .limit(5)
    .find()
  const row = (result.items ?? [])[0] as FamilyGuardianRow | undefined
  if (!row?._id) throw new Error('Invite not found or already used')
  if (row.status === 'revoked' || row.active === false) throw new Error('This invite was revoked')
  if (row.status === 'active') {
    if (norm(String(row.guardianEmail ?? '')) === email) {
      return { primaryParentEmail: norm(String(row.primaryParentEmail ?? '')) }
    }
    throw new Error('Invite already accepted by someone else')
  }
  if (row.inviteExpiresAt && new Date(row.inviteExpiresAt).getTime() < Date.now()) {
    throw new Error('This invite has expired — ask them to send a new one')
  }
  const expected = norm(String(row.guardianEmail ?? ''))
  if (expected && expected !== email) {
    throw new Error(`Sign in as ${expected} to accept this invite`)
  }

  await client.items.update(FAMILY_GUARDIANS_COLLECTION, {
    ...row,
    _id: row._id,
    guardianEmail: email,
    status: 'active',
    acceptedAt: new Date().toISOString(),
    inviteTokenHash: '',
    active: true,
  })
  return { primaryParentEmail: norm(String(row.primaryParentEmail ?? '')) }
}

export async function revokeGuardianLink(opts: {
  primaryParentEmail: string
  guardianEmail: string
}): Promise<void> {
  const primary = norm(opts.primaryParentEmail)
  const guardian = norm(opts.guardianEmail)
  const client = getWixClient()
  const result = await client.items
    .query(FAMILY_GUARDIANS_COLLECTION)
    .eq('primaryParentEmail', primary)
    .eq('guardianEmail', guardian)
    .limit(5)
    .find()
  for (const row of (result.items ?? []) as FamilyGuardianRow[]) {
    if (!row._id) continue
    await client.items.update(FAMILY_GUARDIANS_COLLECTION, {
      ...row,
      _id: row._id,
      status: 'revoked',
      active: false,
      inviteTokenHash: '',
    })
  }
}

export async function findInviteByToken(token: string): Promise<FamilyGuardianRow | null> {
  const hash = hashInviteToken(token)
  try {
    const client = getWixClient()
    const result = await client.items
      .query(FAMILY_GUARDIANS_COLLECTION)
      .eq('inviteTokenHash', hash)
      .limit(1)
      .find()
    return ((result.items ?? [])[0] as FamilyGuardianRow | undefined) ?? null
  } catch {
    return null
  }
}
