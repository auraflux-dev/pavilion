/**
 * Staff fulfillment queue for membership physical perks (shirt, magnet).
 * Flow: pending → ordered → picked_up (legacy: fulfilled = picked_up).
 */
import { getWixClient } from '@/lib/wix-client'
import {
  isPhysicalPerkOpen,
  isPhysicalPerkPickedUp,
  parseEntitlementsJson,
  type MembershipEntitlement,
  type MembershipEntitlementKind,
  type MembershipEntitlementStatus,
} from '@/lib/membership-entitlements'

export type FulfillmentQueueItem = {
  membershipId: string
  parentEmail: string
  parentFirstName: string
  parentLastName: string
  /** Comma-separated student names for staff lookup */
  studentNames: string
  tier: string
  shirtSize: string
  kind: MembershipEntitlementKind
  label: string
  detail: string
  notes: string
  status: MembershipEntitlementStatus
  expiresAt: string
}

export type FulfillmentAction = 'ordered' | 'picked_up'

function isFulfillable(kind: string) {
  return kind === 'spirit_shirt' || kind === 'magnet'
}

type FamilyLookup = {
  parentFirstName: string
  parentLastName: string
  studentNames: string[]
}

async function loadFamilyLookupByEmail(): Promise<Map<string, FamilyLookup>> {
  const client = getWixClient()
  const map = new Map<string, FamilyLookup>()
  try {
    const rows: Record<string, unknown>[] = []
    let skip = 0
    for (let i = 0; i < 50; i += 1) {
      const res = await client.items.query('Students').limit(100).skip(skip).find()
      const batch = (res.items ?? []) as Record<string, unknown>[]
      rows.push(...batch)
      if (batch.length < 100) break
      skip += 100
    }
    for (const row of rows) {
      if (row.archived === true) continue
      const email = String(row.parentEmail ?? '')
        .trim()
        .toLowerCase()
      if (!email) continue
      const parentFirst = String(row.parentFirstName ?? '').trim()
      const parentLast = String(row.parentLastName ?? '').trim()
      const student =
        `${String(row.firstName ?? '').trim()} ${String(row.lastName ?? '').trim()}`.trim()
      const existing = map.get(email)
      if (!existing) {
        map.set(email, {
          parentFirstName: parentFirst,
          parentLastName: parentLast,
          studentNames: student ? [student] : [],
        })
        continue
      }
      if (!existing.parentFirstName && parentFirst) existing.parentFirstName = parentFirst
      if (!existing.parentLastName && parentLast) existing.parentLastName = parentLast
      if (student && !existing.studentNames.includes(student)) {
        existing.studentNames.push(student)
      }
    }
  } catch {
    // Students query optional for enrichment
  }
  for (const entry of map.values()) {
    entry.studentNames.sort((a, b) => a.localeCompare(b))
  }
  return map
}

export async function listOpenFulfillments(): Promise<FulfillmentQueueItem[]> {
  const client = getWixClient()
  const [res, familyByEmail] = await Promise.all([
    client.items.query('Memberships').limit(200).find(),
    loadFamilyLookupByEmail(),
  ])
  const out: FulfillmentQueueItem[] = []

  for (const row of res.items ?? []) {
    const rec = row as Record<string, unknown>
    const id = String(row._id ?? '')
    if (!id) continue
    const email = String(rec.email ?? '').trim().toLowerCase()
    const tier = String(rec.tier ?? '').trim().toLowerCase()
    const shirtSize = String(rec.shirtSize ?? '').trim()
    const family = familyByEmail.get(email)
    const parentFirstName =
      String(rec.parentFirstName ?? rec.firstName ?? '').trim() ||
      family?.parentFirstName ||
      ''
    const parentLastName =
      String(rec.parentLastName ?? rec.lastName ?? '').trim() || family?.parentLastName || ''
    const studentNames = (family?.studentNames ?? []).join(', ')
    const entitlements = parseEntitlementsJson(rec.entitlementsJson)
    for (const e of entitlements) {
      if (!isFulfillable(e.kind)) continue
      if (!isPhysicalPerkOpen(e.status)) continue
      out.push({
        membershipId: id,
        parentEmail: email,
        parentFirstName,
        parentLastName,
        studentNames,
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

  out.sort((a, b) => {
    // Ordered first (ready for pickup), then pending
    if (a.status !== b.status) {
      if (a.status === 'ordered') return -1
      if (b.status === 'ordered') return 1
    }
    const an = `${a.parentLastName} ${a.parentFirstName}`.trim().toLowerCase()
    const bn = `${b.parentLastName} ${b.parentFirstName}`.trim().toLowerCase()
    if (an && bn && an !== bn) return an.localeCompare(bn)
    return a.parentEmail.localeCompare(b.parentEmail) || a.kind.localeCompare(b.kind)
  })
  return out
}

/** @deprecated use listOpenFulfillments */
export async function listPendingFulfillments(): Promise<FulfillmentQueueItem[]> {
  return listOpenFulfillments()
}

export async function updateEntitlementFulfillment(opts: {
  membershipId: string
  kind: MembershipEntitlementKind
  action: FulfillmentAction
  byEmail: string
  note?: string
}): Promise<MembershipEntitlement[]> {
  const client = getWixClient()
  const row = (await client.items.get('Memberships', opts.membershipId)) as Record<string, unknown>
  if (!row?._id) throw new Error('Membership not found')

  const entitlements = parseEntitlementsJson(row.entitlementsJson)
  const now = new Date().toISOString().slice(0, 10)
  const label = opts.action === 'ordered' ? 'Ordered' : 'Picked up'
  const nextStatus: MembershipEntitlementStatus =
    opts.action === 'ordered' ? 'ordered' : 'picked_up'

  const next = entitlements.map((e) => {
    if (e.kind !== opts.kind) return e
    if (opts.action === 'ordered' && isPhysicalPerkPickedUp(e.status)) {
      throw new Error('Already picked up — cannot mark ordered')
    }
    if (opts.action === 'ordered' && e.status === 'ordered') {
      return e
    }
    return {
      ...e,
      status: nextStatus,
      notes: [e.notes, `${label} ${now} by ${opts.byEmail}`, opts.note?.trim() || '']
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

export async function markEntitlementFulfilled(opts: {
  membershipId: string
  kind: MembershipEntitlementKind
  fulfilledByEmail: string
  note?: string
}): Promise<MembershipEntitlement[]> {
  return updateEntitlementFulfillment({
    membershipId: opts.membershipId,
    kind: opts.kind,
    action: 'picked_up',
    byEmail: opts.fulfilledByEmail,
    note: opts.note,
  })
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
      '',
  )

  const tier = String(row.tier ?? '')
  const shirtSize = String(row.shirtSize ?? '')
  const stored = parseEntitlementsJson(row.entitlementsJson)
  const { buildMembershipEntitlements } = await import('@/lib/membership-entitlements')
  const enrichmentCode = String(row.enrichmentCode ?? '').trim() || discountCode || null
  const fresh = buildMembershipEntitlements({
    tier,
    shirtSize,
    enrichmentCode,
  })
  // Keep cove credit + physical fulfillment progress from stored; refresh copy
  const entitlements: MembershipEntitlement[] = []
  const storedCove = stored.find((s) => s.kind === 'cove_credit')
  if (storedCove) entitlements.push(storedCove)
  for (const f of fresh) {
    if (f.kind === 'cove_credit') continue
    const prev = stored.find((s) => s.kind === f.kind)
    if (prev && (f.kind === 'spirit_shirt' || f.kind === 'magnet')) {
      if (isPhysicalPerkPickedUp(prev.status) || prev.status === 'ordered') {
        entitlements.push({
          ...f,
          status: prev.status === 'fulfilled' ? 'picked_up' : prev.status,
          detail: prev.detail || f.detail,
          notes: prev.notes || f.notes,
        })
        continue
      }
    }
    entitlements.push(f)
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
