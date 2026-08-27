/**
 * Membership tiers for the public page + checkout wiring.
 *
 * Display copy (name, price, description, perk bullets) comes from the linked
 * Wix Stores Catalog product description. edit products in Catalog, not a
 * duplicate CMS table.
 *
 * MembershipTiers CMS is only the thin map: tierId → productId, sortOrder,
 * popular, and operational fields (giftCardCredit override, discountPercent).
 */

import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { vanillaizeCopy } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'

export interface MembershipTier {
  id: string
  tierId: string // 'reef' | 'lagoon' | 'tide' | 'faculty' | legacy aliases
  name: string
  price: number
  description: string
  perks: string[]
  popular: boolean
  sortOrder: number
  active: boolean
  /** Dollars loaded onto the student's Square gift card at purchase (0 = no load). */
  giftCardCredit: number
  /** Wix Catalog product UUID for this tier's checkout. */
  productId: string
  /** Optional Wix Catalog variant UUID. */
  variantId: string
 /** Default checkout discount % when issuing codes to members on this tier (5 to 75). */
  discountPercent?: number
}

interface WixDataItem {
  id?: string
  data?: {
    tierId?: string
    name?: string
    price?: number
    description?: string
    perks?: string
    popular?: boolean
    highlighted?: boolean
    sortOrder?: number
    active?: boolean
    giftCardCredit?: number
    productId?: string
    variantId?: string
    discountPercent?: number
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' '))
}

/** Parse Catalog product HTML description → blurb + bullet list. */
/** ES5-safe global regex capture (avoids matchAll / downlevelIteration). */
function matchCaptures(input: string, re: RegExp): string[] {
  const out: string[] = []
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`
  const global = new RegExp(re.source, flags)
  let m: RegExpExecArray | null
  while ((m = global.exec(input)) !== null) {
    out.push(m[1] ?? '')
    if (m[0].length === 0) global.lastIndex += 1
  }
  return out
}

export function parseProductDescriptionHtml(html: string): {
  description: string
  perks: string[]
} {
  if (!html) return { description: '', perks: [] }
  const perks = matchCaptures(html, /<li\b[^>]*>([\s\S]*?)<\/li>/gi)
    .map((inner) => stripHtml(inner))
    .filter(Boolean)
  const paragraphs = matchCaptures(html, /<p\b[^>]*>([\s\S]*?)<\/p>/gi)
    .map((inner) => stripHtml(inner))
    .filter(Boolean)
  const description =
    paragraphs.find((p) => !/membership\s*[—\-–]\s*\$?\d+/i.test(p) && p.length > 24) ??
    paragraphs[1] ??
    ''
  return { description, perks }
}

function displayNameFromProduct(productName: string, fallback: string): string {
  const cleaned = productName
    .replace(/^PTO\s+Membership\s*[—\-–:]\s*/i, '')
    .replace(/\s+Membership$/i, '')
    .trim()
  return cleaned || fallback
}

function giftCardFromPerks(perks: string[], cmsFallback: number): number {
  for (const perk of perks) {
    const m = perk.match(/\$(\d+)\s*(?:prepaid|pto\s*card|store\s*card)/i)
    if (m) return Number(m[1])
  }
  return cmsFallback
}

async function fetchCatalogProduct(productId: string): Promise<{
  name: string
  price: number
  descriptionHtml: string
  variantId: string
} | null> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId || !productId) return null

  try {
    const res = await fetch(`https://www.wixapis.com/stores-reader/v1/products/${productId}`, {
      headers: {
        Authorization: apiKey,
        'wix-site-id': siteId,
      },
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const product = data.product as {
      name?: string
      description?: string
      price?: { price?: number | string }
      priceData?: { price?: number | string }
      variants?: Array<{ id?: string; _id?: string }>
    }
    if (!product) return null
    const price = Number(product.price?.price ?? product.priceData?.price ?? 0) || 0
    const variantId = String(product.variants?.[0]?.id ?? product.variants?.[0]?._id ?? '')
    return {
      name: String(product.name ?? ''),
      price,
      descriptionHtml: String(product.description ?? ''),
      variantId,
    }
  } catch {
    return null
  }
}

type CmsTier = {
  id: string
  tierId: string
  name: string
  price: number
  description: string
  perks: string[]
  popular: boolean
  sortOrder: number
  active: boolean
  giftCardCredit: number
  productId: string
  variantId: string
  discountPercent?: number
}

async function fetchCmsTiers(): Promise<CmsTier[]> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) return []

  try {
    const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
        'wix-site-id': siteId,
      },
      body: JSON.stringify({
        dataCollectionId: 'MembershipTiers',
        query: {
          filter: { active: { $eq: true } },
          sort: [{ fieldName: 'sortOrder', order: 'ASC' }],
          paging: { limit: 20 },
        },
      }),
      next: { revalidate: 60 },
    })

    if (!res.ok) return []

    const data = await res.json()
    return (data.dataItems ?? [])
      .map((item: WixDataItem) => ({
      id: item.id ?? '',
      tierId: item.data?.tierId ?? '',
      name: item.data?.name ?? '',
      price: item.data?.price ?? 0,
      description: item.data?.description ?? '',
      perks: (item.data?.perks ?? '')
        .split('\n')
        .map((p: string) => p.trim())
        .filter(Boolean),
      popular: item.data?.popular ?? item.data?.highlighted ?? false,
      sortOrder: item.data?.sortOrder ?? 99,
      active: item.data?.active ?? true,
      giftCardCredit: Number(item.data?.giftCardCredit ?? 0) || 0,
      productId: String(item.data?.productId ?? '').trim(),
      variantId: String(item.data?.variantId ?? '').trim(),
      discountPercent: Number(item.data?.discountPercent ?? 0) || undefined,
    }))
      .filter((t: CmsTier) => !isCmsQaItem(t.tierId, t.name, t.description))
  } catch {
    return []
  }
}

/**
 * Paid tiers: Catalog product is source of truth for name, price, description, bullets.
 * Faculty (and rows without productId) keep CMS copy.
 */
export async function getMembershipTiers(): Promise<MembershipTier[]> {
  const { getActiveBrandPack } = await import('@/lib/crm/active-trial-server')
  const brandPack = await getActiveBrandPack()
  if (brandPack?.tiers?.length) {
    return brandPack.tiers.map((t) => ({ ...t, perks: [...t.perks] }))
  }
  if (isDemoInstance()) {
    const { DEMO_TIERS } = await import('@/lib/demo/content')
    return DEMO_TIERS.map((t) => ({ ...t, perks: [...t.perks] }))
  }
  const cmsTiers = await fetchCmsTiers()
  if (!cmsTiers.length) return []

  return Promise.all(
    cmsTiers.map(async (tier) => {
      if (tier.tierId === 'faculty' || !tier.productId) {
        return tier
      }

      const product = await fetchCatalogProduct(tier.productId)
      if (!product) return tier

      const { description, perks } = parseProductDescriptionHtml(product.descriptionHtml)
      const giftCardCredit = giftCardFromPerks(perks, tier.giftCardCredit)

      return {
        ...tier,
        name: displayNameFromProduct(product.name, tier.name),
        price: product.price || tier.price,
        description: description || tier.description,
        perks: perks.length ? perks : tier.perks,
        giftCardCredit,
        variantId: tier.variantId || product.variantId,
      }
    })
  ).then((tiers) =>
    isDemoInstance()
      ? tiers.map((tier) => ({
          ...tier,
          name: vanillaizeCopy(tier.name),
          description: vanillaizeCopy(tier.description),
          perks: tier.perks.map((p) => vanillaizeCopy(p)),
        }))
      : tiers,
  )
}

/** Purchasable memberships (Reef / Lagoon / Tide / Faculty). Excludes free / blank. */
export async function getPaidMembershipTiers(): Promise<MembershipTier[]> {
  const tiers = await getMembershipTiers()
  return tiers.filter((t) => t.tierId && t.tierId !== 'free' && t.price > 0)
}

export async function getMembershipTierById(
  tierId: string
): Promise<MembershipTier | null> {
  const id = tierId.trim().toLowerCase()
  if (!id) return null
  const tiers = await getMembershipTiers()
  return tiers.find((t) => t.tierId.toLowerCase() === id) ?? null
}
