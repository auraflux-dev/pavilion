/**
 * Staff fulfillment queue for membership physical perks (shirt, magnet).
 */
import { getWixClient } from '@/lib/wix-client'
import {
  parseEntitlementsJson,
  type MembershipEntitlement,
  type MembershipEntitlementKind,
} from '@/lib/membership-entitlements'

export type FulfillmentQueueItem = {
  membershipId: string
  parentEmail: string
  tier: string
  shirtSize: string
  kind: MembershipEntitlementKind
  label: string
  detail: string
  notes: string
  status: MembershipEntitlement['status']
  expiresAt: string
}

function isFulfillable(kind: string) {
  return kind === 'spirit_shirt' || kind === 'magnet'
}

export async function listPendingFulfillments(): Promise<FulfillmentQueueItem[]> {
  const client = getWixClient()
  const res = await client.items.query('Memberships').limit(200).find()
  const out: FulfillmentQueueItem[] = []

  for (const row of res.items ?? []) {
    const rec = row as Record<string, unknown>
    const id = String(row._id ?? '')
    if (!id) continue
    const email = String(rec.email ?? '').trim().toLowerCase()
    const tier = String(rec.tier ?? '').trim().toLowerCase()
    const shirtSize = String(rec.shirtSize ?? '').trim()
    const entitlements = parseEntitlementsJson(rec.entitlementsJson)
    for (const e of entitlements) {
      if (!isFulfillable(e.kind)) continue
      if (e.status !== 'pending') continue
      out.push({
        membershipId: id,
        parentEmail: email,
        tier,
        shirtSize: e.kind === 'spirit_shirt' ? e.detail || shirtSize : shirtSize,
        kind: e.kind,
        label: e.label,
        detail: e.detail || '',
        notes: e.notes || '',
        status: e.status,
        expiresAt: String(rec.expiresAt ?? ''),
      })
    }
  }

  out.sort((a, b) => a.parentEmail.localeCompare(b.parentEmail) || a.kind.localeCompare(b.kind))
  return out
}

export async function markEntitlementFulfilled(opts: {
  membershipId: string
  kind: MembershipEntitlementKind
  fulfilledByEmail: string
  note?: string
}): Promise<MembershipEntitlement[]> {
  const client = getWixClient()
  const row = (await client.items.get('Memberships', opts.membershipId)) as Record<string, unknown>
  if (!row?._id) throw new Error('Membership not found')

  const entitlements = parseEntitlementsJson(row.entitlementsJson)
  const now = new Date().toISOString().slice(0, 10)
  const next = entitlements.map((e) => {
    if (e.kind !== opts.kind) return e
    return {
      ...e,
      status: 'fulfilled' as const,
      notes: [
        e.notes,
        `Fulfilled ${now} by ${opts.fulfilledByEmail}`,
        opts.note?.trim() || '',
      ]
        .filter(Boolean)
        .join(' · '),
    }
  })

  await client.items.update('Memberships', {
    ...row,
    _id: String(row._id),
    entitlementsJson: JSON.stringify(next),
  } as never)
  return next
}

export async function getMembershipEntitlements(
  parentEmail: string,
): Promise<{
  tier: string
  shirtSize: string
  entitlements: MembershipEntitlement[]
  discountCode: string
  coveFamilyCode: string
  paidMemberCode: boolean
} | null> {
  const email = parentEmail.trim().toLowerCase()
  const client = getWixClient()
  const res = await client.items.query('Memberships').eq('email', email).limit(1).find()
  const row = res.items?.[0] as Record<string, unknown> | undefined
  if (!row) return null

  const students = await client.items.query('Students').eq('parentEmail', email).limit(5).find()
  const discountCode = String(
    (students.items ?? []).map((s) => (s as { discountCode?: string }).discountCode).find(Boolean) ??
      ''
  )

  const tier = String(row.tier ?? '')
  const shirtSize = String(row.shirtSize ?? '')
  const stored = parseEntitlementsJson(row.entitlementsJson)
  const { buildMembershipEntitlements } = await import('@/lib/membership-entitlements')
  const enrichmentCode =
    String(row.enrichmentCode ?? '').trim() ||
    discountCode ||
    null
  const fresh = buildMembershipEntitlements({
    tier,
    shirtSize,
    enrichmentCode,
  })
  // Keep cove credit + fulfilled physical from stored; refresh pickup / refreshments copy
  const entitlements: MembershipEntitlement[] = []
  const storedCove = stored.find((s) => s.kind === 'cove_credit')
  if (storedCove) entitlements.push(storedCove)
  for (const f of fresh) {
    if (f.kind === 'cove_credit') continue
    const prev = stored.find((s) => s.kind === f.kind)
    if (
      prev &&
      (f.kind === 'spirit_shirt' || f.kind === 'magnet') &&
      prev.status === 'fulfilled'
    ) {
      entitlements.push({ ...f, status: 'fulfilled', notes: prev.notes || f.notes })
    } else {
      entitlements.push(f)
    }
  }

  let coveFamilyCode = ''
  let paidMemberCode = false
  try {
    const { ensureCoveFamilyCode, isPaidMemberFamilyCode } = await import(
      '@/lib/cove-family-code'
    )
    coveFamilyCode = await ensureCoveFamilyCode(email)
    paidMemberCode = isPaidMemberFamilyCode(coveFamilyCode)
  } catch {
    coveFamilyCode = String(row.coveFamilyCode ?? '')
  }

  return {
    tier,
    shirtSize,
    entitlements,
    discountCode: enrichmentCode || '',
    coveFamilyCode,
    paidMemberCode,
  }
}
