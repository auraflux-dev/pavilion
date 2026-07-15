/**
 * Fallback catalog IDs when SiteSettings keys are empty.
 * Admins override via Wix CMS → SiteSettings (see docs/WIX-VS-VERCEL.md).
 */
export const CATALOG_DEFAULTS = {
  membershipRubyProductId: '89ad5f10-a4bc-4a31-af4a-22b6add4cad4',
  membershipRubyVariantId: '23ea8122-e8b0-4eea-912f-c4227308193d',
  membershipSupremeProductId: '58f334f3-32d7-4d38-9639-7e587a38a26f',
  membershipSupremeVariantId: '1bfd31dd-32e6-4781-9083-97168e82cb1d',
  storeCardProductId: 'eb2a71dc-7f0f-41b4-85bc-76b0869e5d30',
  storeCardVariant10: 'c30c1bf1-a771-427c-85f9-d67317fe785d',
  storeCardVariant20: 'bddb2f05-4ce4-4d41-848a-f6b3dc9bf478',
  storeCardVariant25: '24000231-2b43-4dee-8434-695f3034858d',
  /** Comma-separated amounts that must match Catalog store-card variants */
  storeCardAmounts: '10,20,25',
  storeCardSlug: 'pto-store-card',
  membershipRubySlug: 'pto-membership-ruby-1',
  membershipSupremeSlug: 'pto-membership-supreme-1',
} as const

export type CatalogConfig = {
  rubyProductId: string
  rubyVariantId: string
  supremeProductId: string
  supremeVariantId: string
  storeCardProductId: string
  storeCardSlug: string
  rubySlug: string
  supremeSlug: string
  /** Sorted unique amounts with matching variantIds */
  storeCardAmounts: number[]
  storeCardVariantByAmount: Record<number, string>
}
