/**
 * Capability registry — product slices we can enable per customer.
 * Surfaces: website | member | staff. See docs/SOLUTION-PACKAGING.md.
 *
 * Not a runtime feature-flag framework yet. Declarative catalog + presets
 * for Lumi (partial), SHMS VIP (full), demo (safe sample).
 */

export type ProductSurface = 'website' | 'member' | 'staff'

export type CapabilityId =
  | 'site.marketing'
  | 'site.programs'
  | 'site.events'
  | 'site.retail'
  | 'portal.family'
  | 'portal.membership'
  | 'staff.cms'
  | 'staff.comms'
  | 'staff.finance'
  | 'staff.pos'
  | 'connect.wix'
  | 'connect.square'
  | 'connect.plaid'
  | 'platform.trial'
  | 'staff.signups'
  | 'site.signups'

export type CapabilityDef = {
  id: CapabilityId
  surfaces: ProductSurface[]
  /** Other capabilities this one expects when fully live */
  requires?: CapabilityId[]
  summary: string
}

export const CAPABILITY_CATALOG: CapabilityDef[] = [
  {
    id: 'site.marketing',
    surfaces: ['website'],
    summary: 'Public marketing pages (home, board, contact, volunteer, …)',
  },
  {
    id: 'site.programs',
    surfaces: ['website', 'staff'],
    summary: 'Programs catalog + staff Programs workspace',
  },
  {
    id: 'site.events',
    surfaces: ['website', 'staff'],
    summary: 'Public events + staff Events workspace',
  },
  {
    id: 'site.retail',
    surfaces: ['website', 'staff'],
    requires: ['connect.square'],
    summary: 'Cove / cart / staff retail (checkout needs Square)',
  },
  {
    id: 'portal.family',
    surfaces: ['member'],
    summary: 'Member portal hub, family, students, guardians',
  },
  {
    id: 'portal.membership',
    surfaces: ['member', 'staff'],
    requires: ['portal.family'],
    summary: 'Membership tiers, benefits, staff membership tools',
  },
  {
    id: 'staff.cms',
    surfaces: ['staff', 'website'],
    summary: 'Staff page copy, nav, site settings → visitor site',
  },
  {
    id: 'staff.comms',
    surfaces: ['staff'],
    summary: 'Newsletter, outreach, comms calendar',
  },
  {
    id: 'staff.finance',
    surfaces: ['staff'],
    summary: 'Payments, budget, expenses (often needs Square/Plaid)',
  },
  {
    id: 'staff.pos',
    surfaces: ['staff'],
    requires: ['connect.square'],
    summary: 'In-person / terminal POS',
  },
  {
    id: 'connect.wix',
    surfaces: ['website', 'staff'],
    summary: 'Wix CMS / member auth connector (SHMS VIP path)',
  },
  {
    id: 'connect.square',
    surfaces: ['website', 'staff', 'member'],
    summary: 'Square OAuth / payments',
  },
  {
    id: 'connect.plaid',
    surfaces: ['staff'],
    summary: 'Plaid bank sync',
  },
  {
    id: 'platform.trial',
    surfaces: ['website', 'member', 'staff'],
    summary: 'Shared-stack trial tenancy (not for SHMS VIP)',
  },
  {
    id: 'staff.signups',
    surfaces: ['staff', 'website'],
    summary: 'SignUpGenius-style sheets — create slots, public link, roster',
  },
  {
    id: 'site.signups',
    surfaces: ['website'],
    requires: ['staff.signups'],
    summary: 'Public /signups/{slug} participant pages',
  },
]

/** Hosting is separate from which capabilities are on. */
export type HostingSku = 'vip-dedicated' | 'shared-platform' | 'wix-wall' | 'demo-sample'

export type CustomerCapabilityPack = {
  slug: string
  label: string
  hosting: HostingSku
  capabilities: CapabilityId[]
  notes?: string
}

/** SHMS VIP — near-full dedicated; no shared-stack trial tenancy. */
export const PACK_SHMS_VIP: CustomerCapabilityPack = {
  slug: 'shms-vip',
  label: 'Stone Hill VIP dedicated',
  hosting: 'vip-dedicated',
  capabilities: [
    'site.marketing',
    'site.programs',
    'site.events',
    'site.retail',
    'portal.family',
    'portal.membership',
    'staff.cms',
    'staff.comms',
    'staff.finance',
    'staff.pos',
    'connect.wix',
    'connect.square',
    'connect.plaid',
  ],
  notes: 'treasurer Vercel + Wix. Not platform.trial.',
}

/** Safe public sample on commons-pto-demo. */
export const PACK_DEMO_SAMPLE: CustomerCapabilityPack = {
  slug: 'demo-sample',
  label: 'Pavilion demo sample',
  hosting: 'demo-sample',
  capabilities: [
    'site.marketing',
    'site.programs',
    'site.events',
    'staff.cms',
    'portal.family',
  ],
  notes: 'Live money / POS / mail hidden until trial + connectors.',
}

/**
 * Lumi starting point — some, not all.
 * Sales can narrow further; this is the product default “partial” pack.
 */
export const PACK_LUMI_PARTIAL: CustomerCapabilityPack = {
  slug: 'lumi-partial',
  label: 'Lumi partial (site + CMS + programs)',
  hosting: 'wix-wall',
  capabilities: [
    'site.marketing',
    'site.programs',
    'site.events',
    'staff.cms',
    'connect.wix',
    'staff.signups',
    'site.signups',
  ],
  notes: 'No portal/retail/POS/Plaid until they ask. Hosting may stay Wix.',
}

export const CAPABILITY_PACKS: CustomerCapabilityPack[] = [
  PACK_SHMS_VIP,
  PACK_DEMO_SAMPLE,
  PACK_LUMI_PARTIAL,
]

export function packHas(pack: CustomerCapabilityPack, id: CapabilityId): boolean {
  return pack.capabilities.includes(id)
}

export function capabilityById(id: CapabilityId): CapabilityDef | undefined {
  return CAPABILITY_CATALOG.find((c) => c.id === id)
}
