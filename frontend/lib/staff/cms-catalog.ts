/**
 * Shared Wix CMS list/create/update helpers for Staff visitor-content editors.
 */
import { getWixClient } from '@/lib/wix-client'
import type { StaffRole } from '@/lib/staff/roles'
import { BOARD_PHOTO_HINT } from '@/lib/board-photo'

export type CmsFieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select'

export type CmsField = {
  key: string
  label: string
  type: CmsFieldType
  options?: string[]
  required?: boolean
  hint?: string
}

export type CmsCollectionConfig = {
  id: string
  label: string
  roles: StaffRole[]
  sortField?: string
  fields: CmsField[]
  /** Soft-hide instead of delete */
  activeField?: string
}

export const STAFF_CMS_COLLECTIONS: Record<string, CmsCollectionConfig> = {
  Sponsors: {
    id: 'Sponsors',
    label: 'Sponsors (fundraising)',
    roles: ['programs', 'marketing', 'secretary', 'admin'],
    sortField: 'sortOrder',
    activeField: 'active',
    fields: [
      { key: 'name', label: 'Sponsor name', type: 'text', required: true },
      { key: 'blurb', label: 'Short blurb', type: 'textarea' },
      { key: 'logoUrl', label: 'Logo URL', type: 'text' },
      { key: 'websiteUrl', label: 'Website URL', type: 'text' },
      {
        key: 'tier',
        label: 'Tier',
        type: 'select',
        options: ['Title', 'Gold', 'Silver', 'Community'],
      },
      { key: 'sortOrder', label: 'Sort order', type: 'number' },
      { key: 'active', label: 'Active / show publicly', type: 'boolean' },
    ],
  },
  BoardMembers: {
    id: 'BoardMembers',
    label: 'Board members',
    roles: ['secretary', 'admin'],
    sortField: 'sortOrder',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Title / role', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'bio', label: 'Bio', type: 'textarea' },
      {
        key: 'photo',
        label: 'Photo URL (800×800 square)',
        type: 'text',
        hint: BOARD_PHOTO_HINT,
      },
      { key: 'isExec', label: 'Executive board', type: 'boolean' },
      { key: 'sortOrder', label: 'Sort order', type: 'number' },
    ],
  },
  NavLinks: {
    id: 'NavLinks',
    label: 'Nav & footer links',
    roles: ['marketing', 'secretary', 'admin'],
    sortField: 'sortOrder',
    activeField: 'active',
    fields: [
      { key: 'label', label: 'Label', type: 'text', required: true },
      { key: 'href', label: 'Path (e.g. /programs)', type: 'text', required: true },
      { key: 'sortOrder', label: 'Sort order', type: 'number' },
      { key: 'showInNav', label: 'Show in nav', type: 'boolean' },
      { key: 'showInFooter', label: 'Show in footer', type: 'boolean' },
      { key: 'active', label: 'Active', type: 'boolean' },
    ],
  },
  FAQItems: {
    id: 'FAQItems',
    label: 'FAQ items',
    roles: ['marketing', 'membership', 'secretary', 'admin'],
    sortField: 'sortOrder',
    activeField: 'active',
    fields: [
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'textarea', required: true },
      {
        key: 'page',
        label: 'Page',
        type: 'select',
        options: ['membership', 'volunteer', 'general'],
        required: true,
      },
      { key: 'sortOrder', label: 'Sort order', type: 'number' },
      { key: 'active', label: 'Active', type: 'boolean' },
    ],
  },
  VolunteerOpportunities: {
    id: 'VolunteerOpportunities',
    label: 'Volunteer opportunities',
    roles: ['events', 'secretary', 'admin'],
    sortField: 'sortOrder',
    activeField: 'active',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'commitment', label: 'Commitment', type: 'text' },
      { key: 'icon', label: 'Icon key (optional)', type: 'text' },
      { key: 'sortOrder', label: 'Sort order', type: 'number' },
      { key: 'active', label: 'Active', type: 'boolean' },
    ],
  },
  CoveInventory: {
    id: 'CoveInventory',
    label: 'Cove window inventory',
    roles: ['retail', 'admin'],
    sortField: 'name',
    activeField: 'active',
    fields: [
      { key: 'productId', label: 'Wix product ID', type: 'text', required: true },
      { key: 'variantId', label: 'Wix variant ID (optional)', type: 'text' },
      { key: 'name', label: 'Display name', type: 'text', required: true },
      { key: 'sku', label: 'Barcode / SKU (scanner)', type: 'text' },
      { key: 'quantity', label: 'Quantity on hand', type: 'number', required: true },
      { key: 'active', label: 'Active', type: 'boolean' },
    ],
  },
  SpiritWearDemand: {
    id: 'SpiritWearDemand',
    label: 'Spirit wear size demand',
    roles: ['retail', 'admin'],
    sortField: 'createdAt',
    activeField: 'active',
    fields: [
      { key: 'parentName', label: 'Parent name', type: 'text', required: true },
      { key: 'parentEmail', label: 'Parent email', type: 'text' },
      { key: 'parentPhone', label: 'Parent phone', type: 'text' },
      { key: 'coveFamilyCode', label: 'Cove family code', type: 'text' },
      { key: 'productName', label: 'Product', type: 'text', required: true },
      { key: 'sizeLabel', label: 'Size / option', type: 'text', required: true },
      { key: 'sku', label: 'SKU', type: 'text' },
      { key: 'qty', label: 'Qty wanted', type: 'number' },
      { key: 'eventNote', label: 'Event / table', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
      { key: 'status', label: 'Status (open/ordered/fulfilled/cancelled)', type: 'text' },
      { key: 'source', label: 'Source', type: 'text' },
      { key: 'createdByEmail', label: 'Logged by', type: 'text' },
      { key: 'createdAt', label: 'Created at', type: 'text' },
      { key: 'active', label: 'Active', type: 'boolean' },
    ],
  },
  FundraisingCTAs: {
    id: 'FundraisingCTAs',
    label: 'Fundraising CTAs',
    roles: ['programs', 'treasurer', 'marketing', 'admin'],
    sortField: 'sortOrder',
    activeField: 'active',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'ctaLabel', label: 'Button label', type: 'text' },
      { key: 'href', label: 'Link', type: 'text' },
      { key: 'icon', label: 'Icon key (optional)', type: 'text' },
      { key: 'sortOrder', label: 'Sort order', type: 'number' },
      { key: 'active', label: 'Active', type: 'boolean' },
    ],
  },
  MembershipTiers: {
    id: 'MembershipTiers',
    label: 'Membership tiers',
    roles: ['membership', 'secretary', 'admin'],
    sortField: 'sortOrder',
    activeField: 'active',
    fields: [
 { key: 'tierId', label: 'Tier ID (slug. do not change after sales)', type: 'text', required: true },
      { key: 'name', label: 'CMS fallback name (Catalog overrides paid tiers)', type: 'text', required: true },
      { key: 'price', label: 'CMS fallback price (Catalog overrides)', type: 'number' },
      { key: 'description', label: 'CMS fallback description', type: 'textarea' },
      { key: 'perks', label: 'CMS fallback perks (one per line)', type: 'textarea' },
      { key: 'giftCardCredit', label: 'Store-card credit override ($)', type: 'number' },
      { key: 'productId', label: 'Wix Catalog product ID', type: 'text' },
      { key: 'variantId', label: 'Wix Catalog variant ID (optional)', type: 'text' },
      { key: 'discountPercent', label: 'Default discount %', type: 'number' },
      { key: 'popular', label: 'Most popular badge', type: 'boolean' },
      { key: 'sortOrder', label: 'Sort order', type: 'number' },
      { key: 'active', label: 'Active', type: 'boolean' },
    ],
  },
  Newsletters: {
    id: 'Newsletters',
    label: 'Member newsletters',
    roles: ['marketing', 'secretary', 'membership', 'admin'],
    sortField: 'publishedAt',
    activeField: 'active',
    fields: [
      { key: 'title', label: 'Subject / title', type: 'text', required: true },
      { key: 'body', label: 'Body', type: 'textarea', required: true },
      { key: 'fromName', label: 'From name', type: 'text' },
      {
        key: 'audience',
        label: 'Audience',
        type: 'select',
        options: ['all', 'free', 'paid', 'grade'],
        required: true,
      },
      { key: 'grade', label: 'Grade (if audience=grade)', type: 'select', options: ['6', '7', '8'] },
      { key: 'publishedAt', label: 'Published at (ISO date)', type: 'text' },
      { key: 'active', label: 'Show in portal Messages', type: 'boolean' },
    ],
  },
  CommsCalendarItems: {
    id: 'CommsCalendarItems',
    label: 'Comms calendar',
    roles: ['marketing', 'secretary', 'membership', 'events', 'admin'],
    sortField: 'publishAt',
    activeField: 'active',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'body', label: 'Draft / talking points', type: 'textarea' },
      {
        key: 'audiences',
        label: 'Audiences (comma: parents,school,board)',
        type: 'text',
        required: true,
      },
      {
        key: 'channel',
        label: 'Channel',
        type: 'select',
        options: ['email', 'whatsapp', 'social', 'portal', 'flyer', 'in_person', 'other'],
        required: true,
      },
      {
        key: 'kind',
        label: 'Planner',
        type: 'select',
        options: ['comms', 'content'],
        required: true,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['idea', 'drafting', 'review', 'scheduled', 'published', 'cancelled'],
        required: true,
      },
      { key: 'publishAt', label: 'Publish / send at (ISO)', type: 'text' },
      { key: 'ownerEmail', label: 'Owner email', type: 'text' },
      { key: 'ownerName', label: 'Owner name', type: 'text' },
      { key: 'assetUrl', label: 'Asset / draft URL', type: 'text' },
      { key: 'notes', label: 'Internal notes', type: 'textarea' },
      { key: 'publishedAt', label: 'Published at (ISO)', type: 'text' },
      { key: 'publishedByEmail', label: 'Published by email', type: 'text' },
      { key: 'createdByEmail', label: 'Created by email', type: 'text' },
      { key: 'createdAt', label: 'Created at (ISO)', type: 'text' },
      { key: 'updatedAt', label: 'Updated at (ISO)', type: 'text' },
      { key: 'active', label: 'Active', type: 'boolean' },
    ],
  },
  PortalCalendarEvents: {
    id: 'PortalCalendarEvents',
    label: 'Portal calendar events',
    roles: ['events', 'secretary', 'marketing', 'programs', 'admin'],
    sortField: 'startAt',
    activeField: 'active',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'subtitle', label: 'Subtitle / location', type: 'text' },
      { key: 'startAt', label: 'Start (ISO datetime)', type: 'text', required: true },
      { key: 'endAt', label: 'End (ISO datetime)', type: 'text' },
      { key: 'href', label: 'Link (e.g. /events)', type: 'text' },
      {
        key: 'audience',
        label: 'Audience',
        type: 'select',
        options: ['all', 'grade'],
        required: true,
      },
      { key: 'grade', label: 'Grade (if audience=grade)', type: 'select', options: ['6', '7', '8'] },
      { key: 'active', label: 'Active on portal calendar', type: 'boolean' },
    ],
  },
  KbArticles: {
    id: 'KbArticles',
    label: 'Help knowledge base',
    roles: ['marketing', 'membership', 'secretary', 'admin'],
    sortField: 'order',
    activeField: 'active',
    fields: [
      {
        key: 'audience',
        label: 'Audience',
        type: 'select',
        options: ['member', 'staff'],
        required: true,
      },
      {
        key: 'categoryId',
        label: 'Category id',
        type: 'select',
        options: [
          'account',
          'students',
          'membership',
          'cove',
          'programs',
          'start',
          'parents',
          'comms',
          'admin',
        ],
        required: true,
      },
      { key: 'slug', label: 'URL slug', type: 'text', required: true },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'summary', label: 'Summary', type: 'text' },
      {
        key: 'body',
        label: 'Full article (paragraphs, ## headings, - lists, **bold**)',
        type: 'textarea',
        required: true,
      },
      { key: 'order', label: 'Sort order', type: 'number' },
      { key: 'adminOnly', label: 'Staff admin only', type: 'boolean' },
      {
        key: 'need',
        label: 'Staff role gate (staff audience)',
        type: 'select',
        options: ['none', 'message', 'membership', 'discounts', 'site', 'marketing'],
      },
      { key: 'active', label: 'Active', type: 'boolean' },
    ],
  },
}

/** SiteSettings keys grouped for role-scoped editing (visitor-facing). */
export const SITE_SETTING_GROUPS: {
  id: string
  label: string
  roles: StaffRole[]
  keys: { key: string; label: string; multiline?: boolean }[]
}[] = [
  {
    id: 'announcement',
    label: 'Announcement bar & WhatsApp grade links',
    roles: ['marketing', 'secretary', 'membership', 'admin'],
    keys: [
 { key: 'schoolInSession', label: 'School in session (true/false). shows Programs & Events' },
      { key: 'announcementEnabled', label: 'Enabled (true/false)' },
      { key: 'announcementText', label: 'Banner text', multiline: true },
      { key: 'announcement6thLink', label: '6th grade WhatsApp invite URL' },
      { key: 'announcement7thLink', label: '7th grade WhatsApp invite URL' },
      { key: 'announcement8thLink', label: '8th grade WhatsApp invite URL' },
    ],
  },
  {
    id: 'contact',
    label: 'Contact & store hours',
    roles: ['marketing', 'secretary', 'admin'],
    keys: [
      { key: 'contactEmailGeneral', label: 'General email (contact form inbox)' },
      { key: 'contactEmailTreasurer', label: 'Treasurer email' },
      {
        key: 'contactEmailStoreCoordinator',
        label: 'Cove / store coordinator email (sale alerts)',
      },
      {
        key: 'contactEmailCoveStaff',
        label: 'Cove staff email (sale alerts)',
      },
      {
        key: 'contactEmailVpSales',
        label: 'VP Digital & Retail Sales email (sale alerts)',
      },
      {
        key: 'contactEmailSecretary',
        label: 'Secretary email (sale alerts)',
      },
      {
        key: 'contactEmailPrograms',
        label: 'VP Programs email (programs contact form)',
      },
      {
        key: 'contactEmailEvents',
        label: 'VP Events email (event idea form)',
      },
      {
        key: 'contactEmailSponsorship',
        label: 'VP Initiatives email (sponsorship form)',
      },
      {
        key: 'contactEmailMembershipExperience',
        label:
          'VP Membership Experience email (portal help + business form + sale alerts)',
      },
      {
        key: 'contactEmailVolunteer',
        label: 'Volunteer signup inbox (events / volunteer VP)',
      },
      {
        key: 'contactEmailMarketing',
        label: 'VP Marketing email (portal help + newsletter/survey alerts)',
      },
      {
        key: 'presidentEmail',
        label: 'President email (portal help + general)',
      },
      { key: 'contactAddress', label: 'Address', multiline: true },
      { key: 'contactStoreHours', label: 'The Cove in-person snack window hours' },
      { key: 'storeHours', label: 'The Cove in-person hours (footer / alt)' },
    ],
  },
  {
    id: 'membership',
    label: 'Membership shared benefits',
    roles: ['membership', 'marketing', 'secretary', 'admin'],
    keys: [{ key: 'membershipSharedBenefits', label: 'Shared benefits (one per line)', multiline: true }],
  },
  {
    id: 'volunteer',
    label: 'Volunteer page benefits',
    roles: ['events', 'secretary', 'marketing', 'admin'],
    keys: [{ key: 'volunteerBenefits', label: 'Benefits (one per line)', multiline: true }],
  },
  {
    id: 'fundraising',
    label: 'Fundraising goals & hours',
    roles: ['programs', 'treasurer', 'admin'],
    keys: [
      {
        key: 'fundraisingAnnualGoal',
 label: 'Public annual goal ($). shown on fundraising hero',
      },
      {
        key: 'goalMembership',
 label: 'Internal goal. Membership ($) (staff only, not public)',
      },
      {
        key: 'goalStore',
 label: 'Internal goal. The Cove store card ($) (staff only)',
      },
      {
        key: 'goalSpiritWear',
 label: 'Internal goal. The Cove shop ($) (staff only)',
      },
      {
        key: 'goalDanceNight',
 label: 'Internal goal. Dance night ($) (staff only)',
      },
      {
        key: 'goalNovaMath',
 label: 'Internal goal. Nova Math ($) (staff only)',
      },
      {
        key: 'goalSponsorship',
 label: 'Internal goal. Sponsorships ($) (staff only)',
      },
      { key: 'sponsorshipRaised', label: 'Sponsorships raised (manual $)' },
      { key: 'volunteerHoursRaised', label: 'Volunteer hours raised' },
      {
        key: 'volunteerHoursGoal',
 label: 'Internal goal. Volunteer hours (staff only)',
      },
      { key: 'allocStudentEnrichment', label: 'Alloc % student enrichment' },
      { key: 'allocSchoolEvents', label: 'Alloc % school events' },
      { key: 'allocTeacherSupport', label: 'Alloc % teacher support' },
      { key: 'allocStoreOps', label: 'Alloc % The Cove ops' },
      { key: 'allocPTOAdmin', label: 'Alloc % PTO admin' },
    ],
  },
  {
    id: 'home',
    label: 'Home hero stats & images',
    roles: ['marketing', 'secretary', 'admin'],
    keys: [
 { key: 'heroStatFamilies', label: 'Hero stat. families' },
 { key: 'heroStatPrograms', label: 'Hero stat. programs' },
 { key: 'heroStatVolunteers', label: 'Hero stat. volunteers' },
      { key: 'homeVolunteerImageUrl', label: 'Volunteer section image URL' },
      { key: 'homeVolunteerImageAlt', label: 'Volunteer image alt' },
      { key: 'homeCommunityImageUrl', label: 'Community section image URL' },
      { key: 'homeCommunityImageAlt', label: 'Community image alt' },
      { key: 'homeHeroImageTopUrl', label: 'Home hero top image URL' },
      { key: 'homeHeroImageTopAlt', label: 'Home hero top image alt' },
      { key: 'homeHeroImageBottomUrl', label: 'Home hero bottom image URL' },
      { key: 'homeHeroImageBottomAlt', label: 'Home hero bottom image alt' },
    ],
  },
  {
    id: 'social',
    label: 'Public social URLs',
    roles: ['marketing', 'admin'],
    keys: [
      { key: 'socialFacebook', label: 'Facebook URL' },
      { key: 'socialInstagram', label: 'Instagram URL' },
      { key: 'socialTwitter', label: 'Twitter/X URL' },
      { key: 'socialYoutube', label: 'YouTube URL' },
      {
        key: 'socialInstagramAccountId',
        label: 'Wix Instagram account ID (auto-filled when Staff → Social loads)',
      },
      {
        key: 'socialFacebookAccountId',
        label: 'Wix Facebook account ID (auto-filled when Staff → Social loads)',
      },
      {
        key: 'socialFacebookPageId',
        label: 'Facebook Page ID for publishing',
      },
      {
        key: 'socialPublishEnabled',
        label: 'Social publish enabled (true/false)',
      },
    ],
  },
  {
    id: 'wellness',
    label: 'Teacher & staff wellness',
    roles: ['wellness', 'events', 'admin'],
    keys: [
      { key: 'wellnessWishList', label: 'Classroom / staff wish list (one item per line)', multiline: true },
      { key: 'wellnessNotes', label: 'Internal notes for this week', multiline: true },
      { key: 'wellnessNextTreat', label: 'Next staff appreciation plan', multiline: true },
    ],
  },
  {
    id: 'retail',
    label: 'The Cove product allowlists',
    roles: ['retail', 'admin'],
    keys: [
      { key: 'storeProductIds', label: 'Store product IDs (comma or newline)', multiline: true },
      { key: 'spiritWearProductIds', label: 'Spirit wear product IDs (comma or newline)', multiline: true },
      {
        key: 'membershipShirtProductId',
        label: 'Membership perk tee product ID (Design · Size variants)',
      },
      {
        key: 'membershipShirtDesignsEnabled',
        label:
          'Membership checkout: require design + size (and hold inventory). Set true when all styles are ready; leave false/empty for size-only.',
      },
      {
        key: 'storeCardBonusPercent',
        label:
          'Cove Digital Card first-load / membership bonus % (not on reloads; e.g. 10 = pay $50, load $55)',
      },
      {
        key: 'storeCardAmounts',
        label: 'Cove Digital Card preset amounts (comma-separated, e.g. 20,40,75)',
      },
      {
        key: 'storeCardMinAmount',
        label: 'Cove Digital Card minimum load ($)',
      },
      {
        key: 'storeCardMaxAmount',
        label: 'Cove Digital Card maximum load ($)',
      },
    ],
  },
]

export function collectionsForRoles(roles: StaffRole[], isAdmin: boolean): CmsCollectionConfig[] {
  return Object.values(STAFF_CMS_COLLECTIONS).filter(
    (c) => isAdmin || c.roles.some((r) => roles.includes(r)),
  )
}

export function settingGroupsForRoles(roles: StaffRole[], isAdmin: boolean) {
  return SITE_SETTING_GROUPS.filter((g) => isAdmin || g.roles.some((r) => roles.includes(r)))
}

export async function listCollection(collectionId: string, sortField = 'sortOrder') {
  const client = getWixClient()
  try {
    const result = await client.items.query(collectionId).ascending(sortField).limit(100).find()
    return (result.items ?? []) as Record<string, unknown>[]
  } catch {
    const result = await client.items.query(collectionId).limit(100).find()
    return (result.items ?? []) as Record<string, unknown>[]
  }
}

export function mapCmsRow(item: Record<string, unknown>, fields: CmsField[]) {
  const out: Record<string, unknown> = { id: String(item._id ?? '') }
  for (const f of fields) {
    const v = item[f.key]
    if (f.type === 'boolean') out[f.key] = v === true
    else if (f.type === 'number') out[f.key] = Number(v ?? 0) || 0
    else out[f.key] = String(v ?? '')
  }
  return out
}

export function buildCmsPayload(body: Record<string, unknown>, fields: CmsField[]) {
  const row: Record<string, unknown> = {}
  for (const f of fields) {
    const raw = body[f.key]
    if (f.type === 'boolean') row[f.key] = raw === true || raw === 'true'
    else if (f.type === 'number') row[f.key] = Number(raw ?? 0) || 0
    else row[f.key] = String(raw ?? '').trim()
    if (f.required && !String(row[f.key] ?? '').trim() && f.type !== 'boolean' && f.type !== 'number') {
      throw new Error(`${f.label} is required`)
    }
  }
  return row
}

export async function upsertSiteSetting(key: string, value: string) {
  const client = getWixClient()
  const existing = await client.items.query('SiteSettings').eq('key', key).limit(1).find()
  const found = existing.items?.[0] as { _id?: string } | undefined
  if (found?._id) {
    await client.items.update('SiteSettings', {
      ...(existing.items![0] as object),
      _id: found._id,
      key,
      value,
    } as Parameters<typeof client.items.update>[1])
  } else {
    await client.items.insert('SiteSettings', { key, value })
  }
}
