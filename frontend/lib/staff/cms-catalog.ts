/**
 * Shared Wix CMS list/create/update helpers for Staff visitor-content editors.
 */
import { getWixClient } from '@/lib/wix-client'
import type { StaffRole } from '@/lib/staff/roles'

export type CmsFieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select'

export type CmsField = {
  key: string
  label: string
  type: CmsFieldType
  options?: string[]
  required?: boolean
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
      { key: 'photo', label: 'Photo URL', type: 'text' },
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
      { key: 'tierId', label: 'Tier ID (slug — do not change after sales)', type: 'text', required: true },
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
      { key: 'schoolInSession', label: 'School in session (true/false) — shows Programs & Events' },
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
      { key: 'contactEmailGeneral', label: 'General email' },
      { key: 'contactEmailTreasurer', label: 'Treasurer email' },
      { key: 'presidentEmail', label: 'President email' },
      { key: 'contactAddress', label: 'Address', multiline: true },
      { key: 'contactStoreHours', label: 'Store hours' },
      { key: 'storeHours', label: 'Store hours (alt key)' },
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
      { key: 'fundraisingAnnualGoal', label: 'Annual goal ($)' },
      { key: 'goalMembership', label: 'Goal — Membership ($)' },
      { key: 'goalStore', label: 'Goal — Store ($)' },
      { key: 'goalSpiritWear', label: 'Goal — Spirit wear ($)' },
      { key: 'goalDanceNight', label: 'Goal — Dance night ($)' },
      { key: 'goalNovaMath', label: 'Goal — Nova Math ($)' },
      { key: 'volunteerHoursRaised', label: 'Volunteer hours raised' },
      { key: 'volunteerHoursGoal', label: 'Volunteer hours goal' },
      { key: 'allocStudentEnrichment', label: 'Alloc % student enrichment' },
      { key: 'allocSchoolEvents', label: 'Alloc % school events' },
      { key: 'allocTeacherSupport', label: 'Alloc % teacher support' },
      { key: 'allocStoreOps', label: 'Alloc % store ops' },
      { key: 'allocPTOAdmin', label: 'Alloc % PTO admin' },
    ],
  },
  {
    id: 'home',
    label: 'Home hero stats & images',
    roles: ['marketing', 'secretary', 'admin'],
    keys: [
      { key: 'heroStatFamilies', label: 'Hero stat — families' },
      { key: 'heroStatPrograms', label: 'Hero stat — programs' },
      { key: 'heroStatVolunteers', label: 'Hero stat — volunteers' },
      { key: 'homeVolunteerImageUrl', label: 'Volunteer section image URL' },
      { key: 'homeVolunteerImageAlt', label: 'Volunteer image alt' },
      { key: 'homeCommunityImageUrl', label: 'Community section image URL' },
      { key: 'homeCommunityImageAlt', label: 'Community image alt' },
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
