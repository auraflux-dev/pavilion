/**
 * Catalog product/variant IDs from SiteSettings (with code fallbacks).
 * Wix Dashboard → Content Manager → SiteSettings
 */
import { getSiteSettings } from '@/lib/api/site-settings'
import {
  CATALOG_DEFAULTS,
  type CatalogConfig,
} from '@/lib/defaults/catalog'

function parseAmounts(raw: string, fallback: string): number[] {
  const source = raw.trim() || fallback
  const amounts = source
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
  return amounts.length
    ? Array.from(new Set(amounts)).sort((a, b) => a - b)
    : [20, 40, 75]
}

function parseIdList(raw: string, fallback: string): Set<string> {
  const source = raw.trim() || fallback
  return new Set(
    source
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
}

export async function getCatalogConfig(): Promise<CatalogConfig> {
  const settings = await getSiteSettings()
  const d = CATALOG_DEFAULTS

  const amounts = parseAmounts(
    settings.get('storeCardAmounts', d.storeCardAmounts),
    d.storeCardAmounts
  )

  const variantByAmount: Record<number, string> = {}
  for (const amount of amounts) {
    const key = `storeCardVariant${amount}` as keyof typeof d
    const fallback =
      amount === 10
        ? d.storeCardVariant10
        : amount === 20
          ? d.storeCardVariant20
          : amount === 25
            ? d.storeCardVariant25
            : ''
    const id = settings.get(key, fallback)
    if (id) variantByAmount[amount] = id
  }

  const rubyProductId = settings.get('membershipRubyProductId', d.membershipRubyProductId)
  const rubyVariantId = settings.get('membershipRubyVariantId', d.membershipRubyVariantId)
  const supremeProductId = settings.get(
    'membershipSupremeProductId',
    d.membershipSupremeProductId
  )
  const supremeVariantId = settings.get(
    'membershipSupremeVariantId',
    d.membershipSupremeVariantId
  )
  const pearlProductId = settings.get('membershipPearlProductId', d.membershipPearlProductId)
  const pearlVariantId = settings.get('membershipPearlVariantId', d.membershipPearlVariantId)
  const rubySlug = settings.get('membershipRubySlug', d.membershipRubySlug)
  const supremeSlug = settings.get('membershipSupremeSlug', d.membershipSupremeSlug)
  const pearlSlug = settings.get('membershipPearlSlug', d.membershipPearlSlug)

  const reefCredit =
    parseInt(settings.get('membershipRubyGiftCardCredit', d.membershipRubyGiftCardCredit), 10) || 0
  const lagoonCredit =
    parseInt(
      settings.get('membershipSupremeGiftCardCredit', d.membershipSupremeGiftCardCredit),
      10
    ) || 0
  const tideCredit =
    parseInt(settings.get('membershipPearlGiftCardCredit', d.membershipPearlGiftCardCredit), 10) ||
    0

  const reefEntry = {
    tierId: 'reef',
    productId: settings.get('membershipReefProductId', rubyProductId),
    variantId: settings.get('membershipReefVariantId', rubyVariantId),
    slug: settings.get('membershipReefSlug', rubySlug),
    giftCardCredit: reefCredit,
  }
  const lagoonEntry = {
    tierId: 'lagoon',
    productId: settings.get('membershipLagoonProductId', supremeProductId),
    variantId: settings.get('membershipLagoonVariantId', supremeVariantId),
    slug: settings.get('membershipLagoonSlug', supremeSlug),
    giftCardCredit: lagoonCredit,
  }
  const tideEntry = {
    tierId: 'tide',
    productId: settings.get(
      'membershipTideProductId',
      settings.get('membershipTrenchProductId', pearlProductId)
    ),
    variantId: settings.get(
      'membershipTideVariantId',
      settings.get('membershipTrenchVariantId', pearlVariantId)
    ),
    slug: settings.get(
      'membershipTideSlug',
      settings.get('membershipTrenchSlug', pearlSlug)
    ),
    giftCardCredit: tideCredit,
  }

  // Current ocean names + legacy aliases (same product IDs)
  const membershipByTier: CatalogConfig['membershipByTier'] = {
    reef: reefEntry,
    lagoon: lagoonEntry,
    tide: tideEntry,
    trench: { ...tideEntry, tierId: 'trench' },
    ruby: { ...reefEntry, tierId: 'ruby' },
    supreme: { ...lagoonEntry, tierId: 'supreme' },
    pearl: { ...tideEntry, tierId: 'pearl' },
  }

  return {
    rubyProductId,
    rubyVariantId,
    supremeProductId,
    supremeVariantId,
    pearlProductId,
    pearlVariantId,
    storeCardProductId: settings.get('storeCardProductId', d.storeCardProductId),
    storeCardSlug: settings.get('storeCardSlug', d.storeCardSlug),
    rubySlug,
    supremeSlug,
    pearlSlug,
    membershipByTier,
    storeCardAmounts: amounts,
    storeCardVariantByAmount: variantByAmount,
    storeCardMinAmount: Math.max(
      1,
      parseInt(settings.get('storeCardMinAmount', d.storeCardMinAmount), 10) || 10
    ),
    storeCardMaxAmount: Math.max(
      10,
      parseInt(settings.get('storeCardMaxAmount', d.storeCardMaxAmount), 10) || 500
    ),
    storeProductIds: parseIdList(
      settings.get('storeProductIds', d.storeProductIds),
      d.storeProductIds
    ),
    spiritWearProductIds: parseIdList(
      settings.get('spiritWearProductIds', d.spiritWearProductIds),
      d.spiritWearProductIds
    ),
  }
}

/** Wix ecom catalog path — amount must have a matching product variant. */
export function isAllowedStoreCardAmount(
  amount: number,
  cfg: CatalogConfig
): boolean {
  return cfg.storeCardAmounts.includes(amount) && Boolean(cfg.storeCardVariantByAmount[amount])
}

/**
 * Square / PayPal in-portal loads: whole dollars from min–max (default $1–$500).
 */
export function isAllowedStoreCardLoadAmount(
  amount: number,
  cfg: CatalogConfig
): boolean {
  if (!Number.isInteger(amount)) return false
  return amount >= cfg.storeCardMinAmount && amount <= cfg.storeCardMaxAmount
}
