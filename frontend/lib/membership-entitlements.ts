/**
 * Membership perk entitlements. what we still owe the family after they join.
 * Stored as JSON on Memberships.entitlementsJson and surfaced in the portal / Staff.
 */
export type MembershipEntitlementKind =
  | 'cove_credit'
  | 'enrichment_discount'
  | 'event_refreshments'
  | 'spirit_shirt'
  | 'magnet'
  | 'partner_discounts'

export type MembershipEntitlementStatus =
  | 'fulfilled'
  | 'pending'
  | 'ordered'
  | 'picked_up'
  | 'info'

/** Physical perk still owed (not yet handed to member). */
export function isPhysicalPerkOpen(status: MembershipEntitlementStatus | string): boolean {
  const s = String(status ?? '').trim().toLowerCase()
  return s === 'pending' || s === 'ordered'
}

/** Physical perk already given to the member. */
export function isPhysicalPerkPickedUp(status: MembershipEntitlementStatus | string): boolean {
  const s = String(status ?? '').trim().toLowerCase()
  return s === 'picked_up' || s === 'fulfilled'
}

export type MembershipEntitlement = {
  kind: MembershipEntitlementKind
  label: string
  status: MembershipEntitlementStatus
  /** e.g. shirt size, discount % */
  detail?: string
  notes?: string
}

export const SHIRT_SIZES = [
  'Youth S',
  'Youth M',
  'Youth L',
  'Adult S',
  'Adult M',
  'Adult L',
  'Adult XL',
  'Adult 2XL',
] as const

export type ShirtSize = (typeof SHIRT_SIZES)[number]

/** Until 3PL ships, physical perks are Open House / coordinated pickup. */
export const PHYSICAL_PERK_PICKUP_NOTE =
  'Pick up at Open House on August 13, or email vp-membershipexperience@shmspto.org to coordinate pickup.'

export const EVENT_REFRESHMENTS_NOTE =
  'At PTO events, show your Family Cove 6-digit code (paid member codes end in 9). Volunteers record the code and hand refreshment tickets.'

/** Faculty/teacher membership: choose magnet OR Spirit Wear T-shirt at purchase. */
export type PhysicalPerkChoice = 'spirit_shirt' | 'magnet'

export function tierOffersPhysicalPerkChoice(tier: string): boolean {
  const t = tier.trim().toLowerCase()
  // Faculty/teacher membership only — parents on Lagoon/Tide get both shirt + magnet.
  return t === 'faculty'
}

/** Reef always includes a magnet (no choice UI). */
export function tierAutoMagnet(tier: string): boolean {
  const t = tier.trim().toLowerCase()
  return t === 'reef' || t === 'ruby'
}

/** Parent Lagoon/Tide (and legacy aliases) include a Spirit Wear T-shirt. */
export function tierIncludesShirt(tier: string): boolean {
  const t = tier.trim().toLowerCase()
  return t === 'lagoon' || t === 'tide' || t === 'supreme' || t === 'pearl' || t === 'trench'
}

/** Parent Lagoon/Tide include a magnet in addition to the shirt. */
export function tierIncludesMagnetWithShirt(tier: string): boolean {
  return tierIncludesShirt(tier)
}

/** Shirt size required when the tier includes a shirt, or faculty chose shirt. */
export function tierNeedsShirtSize(tier: string): boolean {
  return tierIncludesShirt(tier)
}

export function tierNeedsMagnet(tier: string): boolean {
  return tierAutoMagnet(tier) || tierIncludesMagnetWithShirt(tier)
}

export function tierNeedsEventRefreshments(tier: string): boolean {
  const t = tier.trim().toLowerCase()
  return (
    t === 'reef' ||
    t === 'lagoon' ||
    t === 'tide' ||
    t === 'ruby' ||
    t === 'supreme' ||
    t === 'pearl' ||
    t === 'trench'
  )
}

export function enrichmentDiscountPercent(tier: string): number {
  const t = tier.trim().toLowerCase()
  if (t === 'tide' || t === 'pearl' || t === 'trench') return 30
  if (t === 'lagoon' || t === 'supreme') return 15
  if (t === 'reef' || t === 'ruby') return 10
  return 0
}

export function buildMembershipEntitlements(opts: {
  tier: string
  shirtSize?: string | null
  /** Faculty only: magnet OR shirt. Parents Lagoon/Tide get both. */
  physicalPerk?: PhysicalPerkChoice | null
  coveCreditDollars?: number
  enrichmentCode?: string | null
}): MembershipEntitlement[] {
  const tier = opts.tier.trim().toLowerCase()
  const out: MembershipEntitlement[] = []

  const credit = opts.coveCreditDollars ?? 0
  if (credit > 0) {
    out.push({
      kind: 'cove_credit',
      label: `$${credit} Cove Digital Card credit`,
      status: 'fulfilled',
      detail: `$${credit.toFixed(0)}`,
      notes: 'Loaded onto your family Cove Digital Card at checkout.',
    })
  }

  const pct = enrichmentDiscountPercent(tier)
  if (pct > 0) {
    const code = String(opts.enrichmentCode ?? '').trim()
    out.push({
      kind: 'enrichment_discount',
      label: `${pct}% enrichment program discount`,
      status: code ? 'fulfilled' : 'pending',
      detail: code || `${pct}%`,
      notes: code
        ? `Use code ${code} at program checkout (also applied automatically for paid members).`
        : 'Applied automatically for paid members at program checkout; staff can also issue a code.',
    })
  }

  if (tierNeedsEventRefreshments(tier)) {
    out.push({
      kind: 'event_refreshments',
      label: 'Free food & refreshments at PTO events',
      status: 'info',
      detail: 'Cove code ends in 9',
      notes: EVENT_REFRESHMENTS_NOTE,
    })
  }

  const choice = normalizePhysicalPerk(opts.physicalPerk)

  if (tierOffersPhysicalPerkChoice(tier)) {
    // Faculty: exclusive magnet OR T-shirt
    if (choice === 'spirit_shirt') {
      const size = String(opts.shirtSize ?? '').trim()
      out.push({
        kind: 'spirit_shirt',
        label: '1 Spirit Wear T-shirt',
        status: 'pending',
        detail: size || 'Size needed',
        notes: size
          ? `Size ${size}. ${PHYSICAL_PERK_PICKUP_NOTE}`
          : `Choose a size so we can fulfill your shirt. ${PHYSICAL_PERK_PICKUP_NOTE}`,
      })
    } else {
      out.push({
        kind: 'magnet',
        label: '1 Stone Hill car magnet',
        status: 'pending',
        detail: 'Circle 5-3/4″ · full color',
        notes: PHYSICAL_PERK_PICKUP_NOTE,
      })
    }
  } else {
    // Parents: Lagoon/Tide get shirt + magnet; Reef gets magnet only
    if (tierIncludesShirt(tier)) {
      const size = String(opts.shirtSize ?? '').trim()
      out.push({
        kind: 'spirit_shirt',
        label: '1 Spirit Wear T-shirt',
        status: 'pending',
        detail: size || 'Size needed',
        notes: size
          ? `Size ${size}. ${PHYSICAL_PERK_PICKUP_NOTE}`
          : `Choose a size so we can fulfill your shirt. ${PHYSICAL_PERK_PICKUP_NOTE}`,
      })
    }
    if (tierAutoMagnet(tier) || tierIncludesMagnetWithShirt(tier)) {
      out.push({
        kind: 'magnet',
        label: '1 Stone Hill car magnet',
        status: 'pending',
        detail: 'Circle 5-3/4″ · full color',
        notes: PHYSICAL_PERK_PICKUP_NOTE,
      })
    }
  }

  if (tier === 'tide' || tier === 'pearl' || tier === 'trench') {
    out.push({
      kind: 'partner_discounts',
      label: 'Partner local-business discounts',
      status: 'info',
      notes: 'Details are shared by email / in the portal when partners are active.',
    })
  }

  return out
}

function normalizePhysicalPerk(
  raw: PhysicalPerkChoice | string | null | undefined,
): PhysicalPerkChoice | null {
  const v = String(raw ?? '').trim().toLowerCase()
  if (v === 'spirit_shirt' || v === 'shirt' || v === 'tshirt' || v === 't-shirt') {
    return 'spirit_shirt'
  }
  if (v === 'magnet' || v === 'car_magnet') return 'magnet'
  return null
}

export function parsePhysicalPerk(
  raw: PhysicalPerkChoice | string | null | undefined,
): PhysicalPerkChoice | null {
  return normalizePhysicalPerk(raw)
}

export function parseEntitlementsJson(raw: unknown): MembershipEntitlement[] {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (row) => row && typeof row === 'object' && typeof (row as { kind?: string }).kind === 'string'
    ) as MembershipEntitlement[]
  } catch {
    return []
  }
}
