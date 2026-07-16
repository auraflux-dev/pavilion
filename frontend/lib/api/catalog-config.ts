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
    : [10, 20, 25]
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

  return {
    rubyProductId: settings.get('membershipRubyProductId', d.membershipRubyProductId),
    rubyVariantId: settings.get('membershipRubyVariantId', d.membershipRubyVariantId),
    supremeProductId: settings.get(
      'membershipSupremeProductId',
      d.membershipSupremeProductId
    ),
    supremeVariantId: settings.get(
      'membershipSupremeVariantId',
      d.membershipSupremeVariantId
    ),
    storeCardProductId: settings.get('storeCardProductId', d.storeCardProductId),
    storeCardSlug: settings.get('storeCardSlug', d.storeCardSlug),
    rubySlug: settings.get('membershipRubySlug', d.membershipRubySlug),
    supremeSlug: settings.get('membershipSupremeSlug', d.membershipSupremeSlug),
    storeCardAmounts: amounts,
    storeCardVariantByAmount: variantByAmount,
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

export function isAllowedStoreCardAmount(
  amount: number,
  cfg: CatalogConfig
): boolean {
  return cfg.storeCardAmounts.includes(amount) && Boolean(cfg.storeCardVariantByAmount[amount])
}
