/**
 * Product modules catalog — check/uncheck per customer build.
 *
 * Shared shape for:
 * - onpavilion.com (Pavilion product + its school customers)
 * - businessrocket.ai (service businesses + their customers)
 * - auraflux.co (video/agency brand + full member portal on brand)
 *
 * Runtime: org modules_json (enabled ids). Catalog is the menu; presets are defaults.
 */

export type ModuleProduct = 'pavilion' | 'businessrocket' | 'auraflux'
export type ModuleSurface = 'website' | 'portal' | 'staff' | 'connect' | 'platform'
export type ModuleGroup =
  | 'website'
  | 'portal'
  | 'staff'
  | 'commerce'
  | 'comms'
  | 'finance'
  | 'connect'
  | 'platform'

export type ProductModuleId =
  // Website
  | 'site.home'
  | 'site.marketing_pages'
  | 'site.programs'
  | 'site.events'
  | 'site.fundraising'
  | 'site.retail'
  | 'site.membership_public'
  | 'site.signups'
  | 'site.surveys'
  | 'site.donate'
  | 'site.p2p'
  | 'site.custom_pages'
  // Portal
  | 'portal.family'
  | 'portal.membership'
  | 'portal.messages'
  | 'portal.community'
  | 'portal.raise'
  | 'portal.store_card'
  | 'portal.programs'
  // Staff
  | 'staff.membership'
  | 'staff.members'
  | 'staff.messages'
  | 'staff.community'
  | 'staff.events'
  | 'staff.signups'
  | 'staff.programs'
  | 'staff.cms'
  | 'staff.pages'
  | 'staff.brand'
  | 'staff.comms'
  | 'staff.newsletter'
  | 'staff.retail'
  | 'staff.pos'
  | 'staff.finance'
  | 'staff.budget'
  | 'staff.expenses'
  | 'staff.timesheets'
  | 'staff.tax'
  | 'staff.check_in'
  | 'staff.directory_print'
  | 'staff.sms'
  | 'staff.help'
  // Connect
  | 'connect.wix'
  | 'connect.square'
  | 'connect.square_ach'
  | 'connect.plaid'
  | 'connect.gmail'
  | 'connect.twilio'
  // Platform
  | 'platform.trial'
  | 'platform.fleet'
  // Business Rocket-leaning (shared catalog; Pavilion may leave off)
  | 'br.scheduling'
  | 'br.invoices'
  | 'br.crm_pipeline'
  | 'br.client_portal'

export type ProductModuleDef = {
  id: ProductModuleId
  label: string
  group: ModuleGroup
  surfaces: ModuleSurface[]
  /** Which product families offer this module in the picker */
  products: ModuleProduct[]
  requires?: ProductModuleId[]
  summary: string
  /** Route / workspace hints for agents */
  codeHints?: string[]
}

export const MODULE_CATALOG: ProductModuleDef[] = [
  // —— Website ——
  {
    id: 'site.home',
    label: 'Public home',
    group: 'website',
    surfaces: ['website'],
    products: ['pavilion', 'businessrocket', 'auraflux'],
    summary: 'Visitor home and primary landing',
    codeHints: ['app/page.tsx', 'cms page sections'],
  },
  {
    id: 'site.marketing_pages',
    label: 'Marketing pages',
    group: 'website',
    surfaces: ['website'],
    products: ['pavilion', 'businessrocket', 'auraflux'],
    summary: 'About, board, contact, volunteer, legal',
  },
  {
    id: 'site.programs',
    label: 'Programs catalog',
    group: 'website',
    surfaces: ['website', 'staff'],
    products: ['pavilion'],
    summary: 'Enrichment / class catalog + staff Programs',
  },
  {
    id: 'site.events',
    label: 'Events',
    group: 'website',
    surfaces: ['website', 'staff'],
    products: ['pavilion', 'businessrocket', 'auraflux'],
    summary: 'Public events + staff Events',
  },
  {
    id: 'site.fundraising',
    label: 'Fundraising page',
    group: 'website',
    surfaces: ['website', 'staff'],
    products: ['pavilion'],
    summary: 'Public fundraising goals and sponsorships',
  },
  {
    id: 'site.retail',
    label: 'School store / retail',
    group: 'commerce',
    surfaces: ['website', 'staff'],
    products: ['pavilion', 'businessrocket'],
    requires: ['connect.square'],
    summary: 'Cove / catalog / cart checkout',
  },
  {
    id: 'site.membership_public',
    label: 'Public membership join',
    group: 'website',
    surfaces: ['website'],
    products: ['pavilion'],
    summary: 'Join / tiers marketing and checkout entry',
  },
  {
    id: 'site.signups',
    label: 'Public sign-up sheets',
    group: 'website',
    surfaces: ['website'],
    products: ['pavilion', 'businessrocket'],
    requires: ['staff.signups'],
    summary: '/signups/{slug} participant pages',
  },
  {
    id: 'site.surveys',
    label: 'Public surveys',
    group: 'website',
    surfaces: ['website', 'staff'],
    products: ['pavilion', 'businessrocket'],
    summary: 'Survey forms and results',
  },
  {
    id: 'site.donate',
    label: 'Donate',
    group: 'commerce',
    surfaces: ['website', 'portal'],
    products: ['pavilion', 'businessrocket'],
    requires: ['connect.square'],
    summary: 'Flexible donation checkout',
  },
  {
    id: 'site.p2p',
    label: 'Peer-to-peer fundraising',
    group: 'commerce',
    surfaces: ['website', 'portal', 'staff'],
    products: ['pavilion', 'businessrocket'],
    requires: ['site.donate'],
    summary: 'Campaigns + personal /p2p share pages',
  },
  {
    id: 'site.custom_pages',
    label: 'Custom pages builder',
    group: 'website',
    surfaces: ['website', 'staff'],
    products: ['pavilion', 'businessrocket', 'auraflux'],
    requires: ['staff.pages'],
    summary: 'Section canvas /p/{slug} pages',
  },

  // —— Portal ——
  {
    id: 'portal.family',
    label: 'Family portal hub',
    group: 'portal',
    surfaces: ['portal'],
    products: ['pavilion', 'businessrocket', 'auraflux'],
    summary:
      'Full Pavilion member portal. New BR and AuraFlux builds use this. Legacy BR light portal stays on businessrocket.ai/portal.',
  },
  {
    id: 'portal.membership',
    label: 'Portal membership',
    group: 'portal',
    surfaces: ['portal', 'staff'],
    products: ['pavilion'],
    requires: ['portal.family'],
    summary: 'Tiers, benefits, renewals in portal + staff',
  },
  {
    id: 'portal.messages',
    label: 'Portal inbox',
    group: 'portal',
    surfaces: ['portal', 'staff'],
    products: ['pavilion', 'businessrocket', 'auraflux'],
    requires: ['portal.family'],
    summary: 'Parent / client inbox messages',
  },
  {
    id: 'portal.community',
    label: 'Community feed',
    group: 'portal',
    surfaces: ['portal', 'staff'],
    products: ['pavilion', 'businessrocket'],
    requires: ['portal.family'],
    summary: 'Grade/committee or client activity feed',
  },
  {
    id: 'portal.raise',
    label: 'Portal raise / share links',
    group: 'portal',
    surfaces: ['portal'],
    products: ['pavilion'],
    requires: ['site.p2p', 'portal.family'],
    summary: 'Family Raise tab for P2P pages',
  },
  {
    id: 'portal.store_card',
    label: 'Store card / prepaid',
    group: 'portal',
    surfaces: ['portal'],
    products: ['pavilion'],
    requires: ['connect.square', 'portal.family'],
    summary: 'Cove Digital Card load/spend',
  },
  {
    id: 'portal.programs',
    label: 'Portal program enroll',
    group: 'portal',
    surfaces: ['portal'],
    products: ['pavilion'],
    requires: ['site.programs', 'portal.family'],
    summary: 'Enroll / schedule from family login',
  },

  // —— Staff ——
  {
    id: 'staff.membership',
    label: 'Staff membership',
    group: 'staff',
    surfaces: ['staff'],
    products: ['pavilion'],
    summary: 'Roster, invite, outreach',
  },
  {
    id: 'staff.members',
    label: 'Staff members lookup',
    group: 'staff',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket'],
    summary: 'Account search and act-as',
  },
  {
    id: 'staff.messages',
    label: 'Staff messages',
    group: 'staff',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket', 'auraflux'],
    summary: 'Send portal inbox notes',
  },
  {
    id: 'staff.community',
    label: 'Staff community moderate',
    group: 'staff',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket'],
    requires: ['portal.community'],
    summary: 'Pin/hide community posts',
  },
  {
    id: 'staff.events',
    label: 'Staff events',
    group: 'staff',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket'],
    summary: 'Create and manage events',
  },
  {
    id: 'staff.signups',
    label: 'Staff sign-up sheets',
    group: 'staff',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket'],
    summary: 'Volunteer / shift sheets + nudge',
  },
  {
    id: 'staff.programs',
    label: 'Staff programs',
    group: 'staff',
    surfaces: ['staff'],
    products: ['pavilion'],
    summary: 'Class roster, attendance, curriculum',
  },
  {
    id: 'staff.cms',
    label: 'Staff CMS / site settings',
    group: 'staff',
    surfaces: ['staff', 'website'],
    products: ['pavilion', 'businessrocket', 'auraflux'],
    summary: 'Page copy, nav, site settings',
  },
  {
    id: 'staff.pages',
    label: 'Staff page sections',
    group: 'staff',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket', 'auraflux'],
    summary: 'Live section canvas and page list',
  },
  {
    id: 'staff.brand',
    label: 'Staff brand',
    group: 'staff',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket', 'auraflux'],
    summary: 'Logo, colors, fonts',
  },
  {
    id: 'staff.comms',
    label: 'Staff comms calendar',
    group: 'comms',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket'],
    summary: 'Comms calendar and campaigns',
  },
  {
    id: 'staff.newsletter',
    label: 'Newsletter',
    group: 'comms',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket'],
    requires: ['connect.gmail'],
    summary: 'Draft, approve, send newsletters',
  },
  {
    id: 'staff.retail',
    label: 'Staff retail',
    group: 'commerce',
    surfaces: ['staff'],
    products: ['pavilion'],
    requires: ['site.retail'],
    summary: 'Stock, pickups, discounts',
  },
  {
    id: 'staff.pos',
    label: 'In-person POS',
    group: 'commerce',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket'],
    requires: ['connect.square'],
    summary: 'Terminal / in-person sales',
  },
  {
    id: 'staff.finance',
    label: 'Staff payments',
    group: 'finance',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket'],
    summary: 'Payment list and refunds',
  },
  {
    id: 'staff.budget',
    label: 'Budget',
    group: 'finance',
    surfaces: ['staff'],
    products: ['pavilion'],
    requires: ['connect.plaid'],
    summary: 'Budget lines and bank sync',
  },
  {
    id: 'staff.expenses',
    label: 'Expenses',
    group: 'finance',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket'],
    summary: 'Reimbursements / expense queue',
  },
  {
    id: 'staff.timesheets',
    label: 'Timesheets',
    group: 'staff',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket'],
    summary: 'Contractor / instructor hours',
  },
  {
    id: 'staff.tax',
    label: 'W-9 / 990 helpers',
    group: 'finance',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket'],
    summary: 'Contractor W-9 tracking and 990 worksheet',
  },
  {
    id: 'staff.check_in',
    label: 'Tablet check-in',
    group: 'staff',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket'],
    summary: 'Door / appointment check-in kiosk',
  },
  {
    id: 'staff.directory_print',
    label: 'Printable directory',
    group: 'staff',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket'],
    summary: 'Print / PDF contact directory',
  },
  {
    id: 'staff.sms',
    label: 'Mass SMS',
    group: 'comms',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket'],
    requires: ['connect.twilio'],
    summary: 'Mass text (gated until carrier wired)',
  },
  {
    id: 'staff.help',
    label: 'Staff help',
    group: 'staff',
    surfaces: ['staff'],
    products: ['pavilion', 'businessrocket', 'auraflux'],
    summary: 'In-app help and KB',
  },

  // —— Connect ——
  {
    id: 'connect.wix',
    label: 'Wix connector',
    group: 'connect',
    surfaces: ['connect'],
    products: ['pavilion'],
    summary: 'Wix CMS / members (VIP path)',
  },
  {
    id: 'connect.square',
    label: 'Square payments',
    group: 'connect',
    surfaces: ['connect'],
    products: ['pavilion', 'businessrocket'],
    summary: 'Card checkout and POS',
  },
  {
    id: 'connect.square_ach',
    label: 'Square ACH',
    group: 'connect',
    surfaces: ['connect'],
    products: ['pavilion', 'businessrocket'],
    requires: ['connect.square'],
    summary: 'Bank account pay option',
  },
  {
    id: 'connect.plaid',
    label: 'Plaid bank sync',
    group: 'connect',
    surfaces: ['connect'],
    products: ['pavilion', 'businessrocket'],
    summary: 'Bank feed for books',
  },
  {
    id: 'connect.gmail',
    label: 'Gmail send',
    group: 'connect',
    surfaces: ['connect'],
    products: ['pavilion', 'businessrocket', 'auraflux'],
    summary: 'Workspace Gmail for outreach',
  },
  {
    id: 'connect.twilio',
    label: 'Twilio SMS',
    group: 'connect',
    surfaces: ['connect'],
    products: ['pavilion', 'businessrocket'],
    summary: 'SMS carrier for mass text',
  },

  // —— Platform ——
  {
    id: 'platform.trial',
    label: 'Shared-stack trial tenancy',
    group: 'platform',
    surfaces: ['platform'],
    products: ['pavilion', 'businessrocket', 'auraflux'],
    summary: 'Host→org trials (not VIP dedicated)',
  },
  {
    id: 'platform.fleet',
    label: 'Platform fleet console',
    group: 'platform',
    surfaces: ['platform'],
    products: ['pavilion', 'businessrocket', 'auraflux'],
    summary: 'Owner console for tenants and health',
  },

  // —— Business Rocket native ——
  {
    id: 'br.scheduling',
    label: 'Scheduling',
    group: 'staff',
    surfaces: ['website', 'portal', 'staff'],
    products: ['businessrocket'],
    summary: 'Appointments and availability',
  },
  {
    id: 'br.invoices',
    label: 'Invoices',
    group: 'finance',
    surfaces: ['portal', 'staff'],
    products: ['businessrocket'],
    requires: ['connect.square'],
    summary: 'Client invoices and pay links',
  },
  {
    id: 'br.crm_pipeline',
    label: 'CRM pipeline',
    group: 'staff',
    surfaces: ['staff'],
    products: ['businessrocket'],
    summary: 'Leads and deal stages',
  },
  {
    id: 'br.client_portal',
    label: 'Client portal (legacy light)',
    group: 'portal',
    surfaces: ['portal'],
    products: ['businessrocket'],
    summary:
      'Legacy light portal for older BR clients on the company host. New builds use portal.family (full Pavilion member portal).',
  },
]

export const MODULE_GROUP_LABEL: Record<ModuleGroup, string> = {
  website: 'Website',
  portal: 'Portal',
  staff: 'Staff',
  commerce: 'Commerce',
  comms: 'Communications',
  finance: 'Finance',
  connect: 'Connectors',
  platform: 'Platform',
}

export type ModulePreset = {
  id: string
  label: string
  product: ModuleProduct
  modules: ProductModuleId[]
  notes?: string
}

export const MODULE_PRESET_PAVILION_DEMO: ModulePreset = {
  id: 'pavilion-demo',
  label: 'Pavilion demo (Riverside)',
  product: 'pavilion',
  modules: MODULE_CATALOG.filter((m) => m.products.includes('pavilion')).map((m) => m.id),
  notes: 'Full product sample on shared stack. Live money gated by connectors/env.',
}

export const MODULE_PRESET_PAVILION_TRIAL: ModulePreset = {
  id: 'pavilion-trial',
  label: 'Pavilion trial default',
  product: 'pavilion',
  modules: [
    'site.home',
    'site.marketing_pages',
    'site.programs',
    'site.events',
    'site.membership_public',
    'site.signups',
    'site.custom_pages',
    'portal.family',
    'portal.membership',
    'portal.messages',
    'portal.community',
    'staff.membership',
    'staff.members',
    'staff.messages',
    'staff.community',
    'staff.events',
    'staff.signups',
    'staff.programs',
    'staff.cms',
    'staff.pages',
    'staff.brand',
    'staff.help',
    'staff.check_in',
    'staff.directory_print',
    'platform.trial',
    'connect.square',
  ],
}

export const MODULE_PRESET_SHMS_VIP: ModulePreset = {
  id: 'shms-vip',
  label: 'Stone Hill VIP',
  product: 'pavilion',
  modules: MODULE_CATALOG.filter(
    (m) => m.products.includes('pavilion') && m.id !== 'platform.trial',
  ).map((m) => m.id),
  notes: 'Dedicated hosting. Wix + Square + Plaid.',
}

export const MODULE_PRESET_BR_STARTER: ModulePreset = {
  id: 'br-starter',
  label: 'Business Rocket starter',
  product: 'businessrocket',
  modules: [
    'site.home',
    'site.marketing_pages',
    'site.events',
    'site.custom_pages',
    'portal.family',
    'portal.messages',
    'br.scheduling',
    'br.invoices',
    'br.crm_pipeline',
    'staff.cms',
    'staff.pages',
    'staff.brand',
    'staff.messages',
    'staff.help',
    'connect.square',
    'connect.gmail',
    'platform.trial',
  ],
  notes:
    'New BR customers get full Pavilion member portal (portal.family). Legacy clients keep businessrocket.ai/portal.',
}

export const MODULE_PRESET_AF_STARTER: ModulePreset = {
  id: 'af-starter',
  label: 'AuraFlux starter',
  product: 'auraflux',
  modules: [
    'site.home',
    'site.marketing_pages',
    'site.events',
    'site.custom_pages',
    'portal.family',
    'portal.messages',
    'staff.cms',
    'staff.pages',
    'staff.brand',
    'staff.messages',
    'staff.help',
    'connect.gmail',
    'platform.trial',
    'platform.fleet',
  ],
  notes: 'AuraFlux brand Staff fleet + full member portal on auraflux.co and customer hosts.',
}

export const MODULE_PRESETS: ModulePreset[] = [
  MODULE_PRESET_PAVILION_DEMO,
  MODULE_PRESET_PAVILION_TRIAL,
  MODULE_PRESET_SHMS_VIP,
  MODULE_PRESET_BR_STARTER,
  MODULE_PRESET_AF_STARTER,
]

export function modulesForProduct(product: ModuleProduct): ProductModuleDef[] {
  return MODULE_CATALOG.filter((m) => m.products.includes(product))
}

export function moduleById(id: ProductModuleId): ProductModuleDef | undefined {
  return MODULE_CATALOG.find((m) => m.id === id)
}

export function isModuleEnabled(
  enabled: readonly ProductModuleId[] | Set<ProductModuleId>,
  id: ProductModuleId,
): boolean {
  if (enabled instanceof Set) return enabled.has(id)
  return enabled.includes(id)
}

/** Drop modules whose requires[] are not all enabled. */
export function sanitizeEnabledModules(enabled: ProductModuleId[]): ProductModuleId[] {
  const set = new Set(enabled)
  let changed = true
  while (changed) {
    changed = false
    for (const id of [...set]) {
      const def = moduleById(id)
      if (!def?.requires?.length) continue
      if (def.requires.some((r) => !set.has(r))) {
        set.delete(id)
        changed = true
      }
    }
  }
  return MODULE_CATALOG.map((m) => m.id).filter((id) => set.has(id))
}
