/**
 * Push a Wix Stores product (by id) into Square POS catalog when SKUs are missing.
 * Used after Staff Cove product create/update so Stand can ring new snacks.
 */
import { randomUUID } from 'crypto'
import { SquareClient, SquareEnvironment } from 'square'
import { getCatalogConfig } from '@/lib/api/catalog-config'
import { SQUARE_LOCATION_ID } from '@/lib/square'

export type SquarePosSyncResult = {
  ok: boolean
  skipped?: boolean
  reason?: string
  createdSkus?: string[]
  existingSkus?: string[]
  missingSkuCount?: number
  squareItemId?: string | null
}

function squareClient() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN
  if (!accessToken) throw new Error('SQUARE_ACCESS_TOKEN is not set')
  return new SquareClient({
    token: accessToken,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  })
}

function dollarsToCents(amount: string | number | undefined): bigint {
  const n = Math.round(Number(amount ?? 0) * 100)
  return BigInt(Number.isFinite(n) && n > 0 ? n : 0)
}

async function listSquareSkus(
  client: ReturnType<typeof squareClient>,
): Promise<Set<string>> {
  const skus = new Set<string>()
  let cursor: string | undefined
  do {
    const page = (await client.catalog.list({ types: 'ITEM', cursor })) as {
      data?: Array<{
        type?: string
        itemData?: {
          variations?: Array<{ itemVariationData?: { sku?: string } }>
        }
      }>
      cursor?: string
    }
    for (const obj of page.data || []) {
      if (obj.type !== 'ITEM') continue
      for (const v of obj.itemData?.variations || []) {
        const sku = String(v.itemVariationData?.sku || '')
          .trim()
          .toUpperCase()
        if (sku) skus.add(sku)
      }
    }
    cursor = page.cursor
  } while (cursor)
  return skus
}

async function ensureCategory(
  client: ReturnType<typeof squareClient>,
  name: string,
): Promise<string | undefined> {
  let cursor: string | undefined
  do {
    const page = (await client.catalog.list({ types: 'CATEGORY', cursor })) as {
      data?: Array<{ type?: string; id?: string; categoryData?: { name?: string } }>
      cursor?: string
    }
    for (const obj of page.data || []) {
      if (obj.type === 'CATEGORY' && obj.categoryData?.name === name) {
        return obj.id
      }
    }
    cursor = page.cursor
  } while (cursor)

  const res = await client.catalog.object.upsert({
    idempotencyKey: randomUUID(),
    object: {
      type: 'CATEGORY',
      id: `#cat-${name.replace(/\s+/g, '-').toLowerCase()}`,
      categoryData: { name },
    },
  })
  return res.catalogObject?.id
}

function variantLabel(
  product: {
    name?: string
    options?: Array<{
      id?: string
      choicesSettings?: { choices?: Array<{ choiceId?: string; name?: string }> }
    }>
  },
  variant: {
    choices?: Array<{
      optionChoiceIds?: { optionId?: string; choiceId?: string }
      optionChoiceNames?: { choiceName?: string }
    }>
  },
): string {
  const labels: string[] = []
  for (const c of variant.choices || []) {
    if (c.optionChoiceNames?.choiceName) {
      labels.push(c.optionChoiceNames.choiceName)
      continue
    }
    const oid = c.optionChoiceIds?.optionId
    const cid = c.optionChoiceIds?.choiceId
    if (!oid || !cid) continue
    for (const opt of product.options || []) {
      if (opt.id !== oid) continue
      const hit = opt.choicesSettings?.choices?.find((x) => x.choiceId === cid)
      if (hit?.name) labels.push(hit.name)
    }
  }
  return labels.filter(Boolean).join(' · ') || 'Regular'
}

async function fetchWixProduct(productId: string): Promise<Record<string, unknown> | null> {
  const siteId = process.env.WIX_SITE_ID
  const apiKey = process.env.WIX_API_KEY
  if (!siteId || !apiKey) return null
  const res = await fetch(`https://www.wixapis.com/stores/v3/products/${productId}`, {
    headers: { Authorization: apiKey, 'wix-site-id': siteId },
  })
  if (!res.ok) return null
  return ((await res.json()) as { product?: Record<string, unknown> }).product ?? null
}

/**
 * Ensure every SKU on this Wix product exists in Square POS.
 * Skips when product is not on Cove/spirit allowlists (unless force).
 */
export async function ensureSquarePosProductFromWix(
  productId: string,
  opts?: { force?: boolean },
): Promise<SquarePosSyncResult> {
  const id = String(productId || '').trim()
  if (!id) return { ok: false, skipped: true, reason: 'no product id' }
  if (!process.env.SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
    return { ok: false, skipped: true, reason: 'Square not configured' }
  }

  const cfg = await getCatalogConfig()
  const onAllowlist =
    cfg.storeProductIds.has(id) || cfg.spiritWearProductIds.has(id)
  if (!opts?.force && !onAllowlist) {
    return { ok: true, skipped: true, reason: 'not on Cove/spirit allowlist' }
  }

  const product = await fetchWixProduct(id)
  if (!product) return { ok: false, skipped: true, reason: 'Wix product not found' }

  const name = String(product.name || '').trim() || 'Cove item'
  const variants =
    (
      product.variantsInfo as
        | {
            variants?: Array<{
              id?: string
              sku?: string
              price?: { actualPrice?: { amount?: string } }
              choices?: Array<{
                optionChoiceIds?: { optionId?: string; choiceId?: string }
                optionChoiceNames?: { choiceName?: string }
              }>
            }>
          }
        | undefined
    )?.variants ?? []

  if (!variants.length) {
    return { ok: false, skipped: true, reason: 'no variants' }
  }

  const client = squareClient()
  const existing = await listSquareSkus(client)
  const toCreate: Array<{ name: string; sku: string; cents: bigint }> = []
  const existingSkus: string[] = []
  let missingSkuCount = 0

  for (const v of variants) {
    const sku = String(v.sku || '')
      .trim()
      .toUpperCase()
    if (!sku) {
      missingSkuCount++
      continue
    }
    if (existing.has(sku)) {
      existingSkus.push(sku)
      continue
    }
    const price =
      v.price?.actualPrice?.amount ??
      (product.price as { actualPrice?: { amount?: string } } | undefined)?.actualPrice
        ?.amount ??
      '0'
    toCreate.push({
      name: variantLabel(product as Parameters<typeof variantLabel>[0], v),
      sku,
      cents: dollarsToCents(price),
    })
  }

  if (!toCreate.length) {
    return {
      ok: true,
      skipped: true,
      reason: missingSkuCount && !existingSkus.length ? 'variants missing SKU' : 'already on Square',
      existingSkus,
      missingSkuCount,
      createdSkus: [],
    }
  }

  const categoryId = await ensureCategory(
    client,
    cfg.spiritWearProductIds.has(id) ? 'Spirit Wear' : 'Cove Snacks',
  )
  const itemId = `#item-${randomUUID().slice(0, 8)}`
  const res = await client.catalog.object.upsert({
    idempotencyKey: randomUUID(),
    object: {
      type: 'ITEM',
      id: itemId,
      presentAtAllLocations: true,
      itemData: {
        name,
        description: 'Synced from Staff Cove · shmspto.org',
        productType: 'REGULAR',
        categories: categoryId ? [{ id: categoryId }] : undefined,
        variations: toCreate.map((v, i) => ({
          type: 'ITEM_VARIATION' as const,
          id: `${itemId}-v${i}`,
          presentAtAllLocations: true,
          itemVariationData: {
            name: v.name,
            sku: v.sku,
            pricingType: 'FIXED_PRICING' as const,
            priceMoney: { amount: v.cents, currency: 'USD' },
            itemId,
            trackInventory: false,
            sellable: true,
            stockable: true,
          },
        })),
      },
    },
  })

  return {
    ok: true,
    createdSkus: toCreate.map((v) => v.sku),
    existingSkus,
    missingSkuCount,
    squareItemId: res.catalogObject?.id ?? null,
  }
}

/** Best-effort; never throws to callers that must not fail Staff product writes. */
export async function syncWixProductToSquareBestEffort(
  productId: string,
): Promise<SquarePosSyncResult> {
  try {
    const result = await ensureSquarePosProductFromWix(productId)
    if (result.createdSkus?.length) {
      console.info('Square POS sync created', productId, result.createdSkus)
    } else if (result.skipped) {
      console.info('Square POS sync skipped', productId, result.reason)
    }
    return result
  } catch (err) {
    console.warn('Square POS sync failed', productId, err)
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'Square sync failed',
    }
  }
}
