/**
 * Staff fulfillment queue for membership physical perks (shirt, magnet).
 * Flow: pending → ordered → picked_up (legacy: fulfilled = picked_up).
 */
import { getWixClient } from '@/lib/wix-client'
import {
  isPhysicalPerkOpen,
  isPhysicalPerkPickedUp,
  mergePortalEntitlements,
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
  /** Membership account number (e.g. A10040) when set */
  accountNumber: string
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

export type FulfillmentAction = 'ordered' | 'picked_up' | 'reopen'

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
  const { open } = await listFulfillmentQueues()
  return open
}

/** Open queue + handed-out physical perks (for undo / reopen). */
export async function listFulfillmentQueues(): Promise<{
  open: FulfillmentQueueItem[]
  handedOut: FulfillmentQueueItem[]
}> {
  const client = getWixClient()
  const familyByEmail = await loadFamilyLookupByEmail()
  const membershipRows: Record<string, unknown>[] = []
  let skip = 0
  for (let i = 0; i < 50; i += 1) {
    const res = await client.items.query('Memberships').limit(100).skip(skip).find()
    const batch = (res.items ?? []) as Record<string, unknown>[]
    membershipRows.push(...batch)
    if (batch.length < 100) break
    skip += 100
  }

  const open: FulfillmentQueueItem[] = []
  const handedOut: FulfillmentQueueItem[] = []

  for (const rec of membershipRows) {
    const id = String(rec._id ?? '')
    if (!id) continue
    const email = String(rec.email ?? '').trim().toLowerCase()
    const tier = String(rec.tier ?? '').trim().toLowerCase()
    const shirtSize = String(rec.shirtSize ?? '').trim()
    const accountNumber = String(rec.accountNumber ?? '').trim()
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
      const item: FulfillmentQueueItem = {
        membershipId: id,
        parentEmail: email,
        parentFirstName,
        parentLastName,
        accountNumber,
        studentNames,
        tier,
        shirtSize: e.kind === 'spirit_shirt' ? e.detail || shirtSize : shirtSize,
        kind: e.kind,
        label: e.label,
        detail: e.detail || '',
        notes: e.notes || '',
        status: e.status,
        expiresAt: String(rec.expiresAt ?? ''),
      }
      if (isPhysicalPerkOpen(e.status)) open.push(item)
      else if (isPhysicalPerkPickedUp(e.status)) handedOut.push(item)
    }
  }

  const byName = (a: FulfillmentQueueItem, b: FulfillmentQueueItem) => {
    const an = `${a.parentLastName} ${a.parentFirstName}`.trim().toLowerCase()
    const bn = `${b.parentLastName} ${b.parentFirstName}`.trim().toLowerCase()
    if (an && bn && an !== bn) return an.localeCompare(bn)
    return a.parentEmail.localeCompare(b.parentEmail) || a.kind.localeCompare(b.kind)
  }

  open.sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === 'ordered') return -1
      if (b.status === 'ordered') return 1
    }
    return byName(a, b)
  })
  handedOut.sort(byName)

  return { open, handedOut }
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

  let nextStatus: MembershipEntitlementStatus
  let label: string
  if (opts.action === 'reopen') {
    nextStatus = 'ordered'
    label = 'Reopened (was handed out in error)'
  } else if (opts.action === 'ordered') {
    nextStatus = 'ordered'
    label = 'Ordered'
  } else {
    nextStatus = 'picked_up'
    label = 'Picked up'
  }

  const next = entitlements.map((e) => {
    if (e.kind !== opts.kind) return e
    if (opts.action === 'reopen') {
      if (!isPhysicalPerkPickedUp(e.status)) {
        throw new Error('Only handed-out items can be reopened')
      }
      return {
        ...e,
        status: nextStatus,
        notes: [e.notes, `${label} ${now} by ${opts.byEmail}`, opts.note?.trim() || '']
          .filter(Boolean)
          .join(' · '),
      }
    }
    if (opts.action === 'ordered' && isPhysicalPerkPickedUp(e.status)) {
      throw new Error('Already picked up. Use Reopen to put it back in the queue.')
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
  const tierNorm = tier.trim().toLowerCase()
  const facultyComplimentary = tierNorm === 'faculty' || tierNorm === 'staff'
  const shirtSize = String(row.shirtSize ?? '')
  const stored = parseEntitlementsJson(row.entitlementsJson)
  const { buildMembershipEntitlements, tierOffersEnrichmentDiscount } = await import(
    '@/lib/membership-entitlements'
  )
  const rawEnrichment = String(row.enrichmentCode ?? '').trim() || discountCode || null
  const enrichmentCode =
    facultyComplimentary || !tierOffersEnrichmentDiscount(tier) ? null : rawEnrichment
  const fresh = buildMembershipEntitlements({
    tier,
    shirtSize,
    enrichmentCode,
  })
  const { appendBoardEntitlements } = await import('@/lib/staff/board-enrichment-discounts')
  let entitlements = appendBoardEntitlements(row, mergePortalEntitlements(stored, fresh))

  // Faculty / school staff: never surface Reef enrichment perk (strip leftovers).
  if (facultyComplimentary) {
    entitlements = entitlements.filter((e) => e.kind !== 'enrichment_discount')
    const dirtyStored = stored.some((e) => e.kind === 'enrichment_discount')
    const dirtyCode = Boolean(String(row.enrichmentCode ?? '').trim() || discountCode)
    if (dirtyStored || dirtyCode) {
      try {
        const { clearEnrichmentCodeFromFamily } = await import('@/lib/staff/enrichment-codes')
        await clearEnrichmentCodeFromFamily(email)
        const nextJson = JSON.stringify(
          parseEntitlementsJson(row.entitlementsJson).filter(
            (e) => e.kind !== 'enrichment_discount',
          ),
        )
        await client.items.update('Memberships', {
          ...row,
          _id: String(row._id),
          enrichmentCode: '',
          entitlementsJson: nextJson,
        })
      } catch {
        // best-effort cleanup
      }
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
