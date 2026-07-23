/**
 * Fallback catalog IDs when SiteSettings keys are empty.
 * Admins override via Wix CMS → SiteSettings (see docs/WIX-VS-VERCEL.md).
 */
export const CATALOG_DEFAULTS = {
  membershipRubyProductId: '89ad5f10-a4bc-4a31-af4a-22b6add4cad4',
  membershipRubyVariantId: '23ea8122-e8b0-4eea-912f-c4227308193d',
  membershipSupremeProductId: '58f334f3-32d7-4d38-9639-7e587a38a26f',
  membershipSupremeVariantId: '1bfd31dd-32e6-4781-9083-97168e82cb1d',
  /** Pearl (3rd paid tier). paste Wix Catalog product/variant IDs in Site Settings when created */
  membershipPearlProductId: '',
  membershipPearlVariantId: '',
  /** Default Square gift-card credits by tier (CMS giftCardCredit overrides).
   *  Must match the amounts advertised on /membership (Reef $20 / Lagoon $40 / Tide $75). */
  membershipRubyGiftCardCredit: '20',
  membershipSupremeGiftCardCredit: '40',
  membershipPearlGiftCardCredit: '75',
  storeCardProductId: 'eb2a71dc-7f0f-41b4-85bc-76b0869e5d30',
  storeCardVariant10: 'c30c1bf1-a771-427c-85f9-d67317fe785d',
  storeCardVariant20: 'bddb2f05-4ce4-4d41-848a-f6b3dc9bf478',
  storeCardVariant25: '24000231-2b43-4dee-8434-695f3034858d',
  /** Suggested new-card load amounts shown in UI (tier-aligned). Refills can be any
   *  whole dollar via the custom field (Square path allows $min–$max). */
  storeCardAmounts: '20,40,75',
  storeCardMinAmount: '1',
  storeCardMaxAmount: '500',
  storeCardSlug: 'pto-store-card',
  membershipRubySlug: 'pto-membership-ruby-1',
  membershipSupremeSlug: 'pto-membership-supreme-1',
  membershipPearlSlug: 'pto-membership-pearl-1',
  /** Comma-separated Wix Catalog product UUIDs shown on /store */
  storeProductIds: [
    '90ae23f7-51f4-438d-869c-1fbb28afd381',
    '96ca63ab-2535-4f91-8ad1-28a5d7d7d7d0',
    'ad137b27-cfa1-45ff-b506-c1021bfad12f',
    'a3e4a887-ad91-42b2-843d-653a11712544',
    '530bfb7e-370e-4174-8e2f-4463b5f34642',
    '53d1d89c-74e3-4f41-9988-5594ce2d590b',
    'fac09820-055c-4202-81ac-545639b8e24f',
    '03be5162-4928-4c39-b707-6e2de07921e0',
    '62b109c8-7b96-4f0d-b09d-fb8d93ff8f9d',
    'fd0bcb5b-6d08-4f0e-bb7c-27bfdc023ae4',
    'd9ed5b01-324d-4136-809d-21a3211b9d89',
    '9e7d4b13-4437-4c51-b63d-4942d18edf64',
  ].join(','),
  /** Comma-separated Wix Catalog product UUIDs shown on /spirit-wear */
  spiritWearProductIds: [
    '82ee7b02-5b3e-4383-8cd8-fcf089b45370',
    '1c0e1c1c-23f8-4095-8e4d-a9c467e6fef8',
    'd0bed142-0410-4442-a8e9-f1a5232862ef',
    'd5730ad6-8d4a-4757-93fa-05aa3ff1e244',
    'e9fbcab5-ae25-418e-a4ac-81889d93acc7',
    'f3eedab0-bfd5-4f30-ad8f-7586b783b78f',
    '791e1007-b926-4416-8a90-24dd641d0887',
  ].join(','),
} as const

export type MembershipProductEntry = {
  tierId: string
  productId: string
  variantId: string
  slug: string
  /** Fallback gift-card dollars when CMS giftCardCredit is empty */
  giftCardCredit: number
}

export type CatalogConfig = {
  rubyProductId: string
  rubyVariantId: string
  supremeProductId: string
  supremeVariantId: string
  pearlProductId: string
  pearlVariantId: string
  storeCardProductId: string
  storeCardSlug: string
  rubySlug: string
  supremeSlug: string
  pearlSlug: string
  /** Paid membership products keyed by tierId (ruby / supreme / pearl / …) */
  membershipByTier: Record<string, MembershipProductEntry>
  /** Sorted unique preset amounts for UI + Wix catalog variants when present */
  storeCardAmounts: number[]
  storeCardVariantByAmount: Record<number, string>
  /** Whole-dollar min/max for Square/PayPal loads (not Wix catalog) */
  storeCardMinAmount: number
  storeCardMaxAmount: number
  /** Product UUIDs allowed on /store (and fundraising store totals) */
  storeProductIds: Set<string>
  /** Product UUIDs allowed on /spirit-wear (and fundraising spirit totals) */
  spiritWearProductIds: Set<string>
}
