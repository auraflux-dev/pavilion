/**
 * Push a Wix Stores product (by id) into Square POS so Stand matches Staff/online:
 * category, primary image, variations/SKUs, and inventory counts from CoveInventory.
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
  categorySynced?: boolean
  imageSynced?: boolean
  inventorySynced?: boolean
  updated?: boolean
}

type SquareCatalogClient = ReturnType<typeof squareClient>

type SquareItemObj = {
  type?: string
  id?: string
  version?: bigint | number
  presentAtAllLocations?: boolean | null
  presentAtLocationIds?: string[] | null
  absentAtLocationIds?: string[] | null
  itemData?: {
    name?: string | null
    description?: string | null
    productType?: string
    categories?: Array<{ id?: string }> | null
    imageIds?: string[] | null
    variations?: Array<{
      type?: string
      id?: string
      version?: bigint | number
      presentAtAllLocations?: boolean | null
      itemVariationData?: {
        name?: string | null
        sku?: string | null
        pricingType?: string
        priceMoney?: { amount?: bigint | number; currency?: string }
        itemId?: string
        trackInventory?: boolean | null
        sellable?: boolean | null
        stockable?: boolean | null
      }
    }>
  }
}

type VariantPlan = {
  name: string
  sku: string
  cents: bigint
  quantity: number | null
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

function wixMediaIdToUrl(mediaId: unknown): string | undefined {
  if (!mediaId || typeof mediaId !== 'string') return undefined
  if (mediaId.startsWith('http')) return mediaId
  const v1Match = mediaId.match(/wix:image:\/\/v1\/([^/]+)\//)
  if (v1Match) return `https://static.wixstatic.com/media/${v1Match[1]}`
  if (mediaId.includes('~mv2') || mediaId.includes('_')) {
    return `https://static.wixstatic.com/media/${mediaId}`
  }
  return undefined
}

function getWixProductImageUrl(product: Record<string, unknown>): string | undefined {
  try {
    const media = product.media as Record<string, unknown> | undefined
    if (!media) return undefined
    const main = media.main as Record<string, unknown> | undefined
    const mainImage = main?.image as { url?: string; id?: string } | undefined
    if (mainImage?.url) return mainImage.url
    if (main?.id) return wixMediaIdToUrl(main.id)
    const itemsInfo = media.itemsInfo as Record<string, unknown> | undefined
    const items = itemsInfo?.items as Array<Record<string, unknown>> | undefined
    const first = items?.[0]
    if (!first) return undefined
    const img = first.image as { url?: string } | undefined
    return img?.url ?? wixMediaIdToUrl(first.id) ?? wixMediaIdToUrl(first.url)
  } catch {
    return undefined
  }
}

async function ensureCategory(
  client: SquareCatalogClient,
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

async function listSquareItemsBySku(
  client: SquareCatalogClient,
): Promise<Map<string, { item: SquareItemObj; variationId: string }>> {
  const bySku = new Map<string, { item: SquareItemObj; variationId: string }>()
  let cursor: string | undefined
  do {
    const page = (await client.catalog.list({ types: 'ITEM', cursor })) as {
      data?: SquareItemObj[]
      cursor?: string
    }
    for (const obj of page.data || []) {
      if (obj.type !== 'ITEM') continue
      for (const v of obj.itemData?.variations || []) {
        const sku = String(v.itemVariationData?.sku || '')
          .trim()
          .toUpperCase()
        if (sku && v.id) bySku.set(sku, { item: obj, variationId: v.id })
      }
    }
    cursor = page.cursor
  } while (cursor)
  return bySku
}

async function ensurePrimaryImage(
  client: SquareCatalogClient,
  itemId: string,
  imageUrl: string | undefined,
  existingImageIds: string[] | null | undefined,
): Promise<boolean> {
  if (!imageUrl) return false
  // Keep an existing Square photo unless missing — avoid re-uploading every save.
  if (existingImageIds && existingImageIds.length > 0) return false

  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) {
    console.warn('Square image download failed', imageUrl, imgRes.status)
    return false
  }
  const buf = Buffer.from(await imgRes.arrayBuffer())
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
  const ext = contentType.includes('png')
    ? 'png'
    : contentType.includes('webp')
      ? 'webp'
      : 'jpg'
  const blob = new Blob([buf], { type: contentType })
  const file = new File([blob], `wix-${itemId.slice(0, 8)}.${ext}`, { type: contentType })

  await client.catalog.images.create({
    request: {
      idempotencyKey: randomUUID(),
      objectId: itemId,
      isPrimary: true,
      image: {
        type: 'IMAGE',
        id: `#img-${randomUUID().slice(0, 8)}`,
        imageData: {
          name: 'Staff / online catalog',
          caption: 'Synced from shmspto.org Staff Cove',
        },
      },
    },
    imageFile: file,
  })
  return true
}

async function syncInventoryCounts(
  client: SquareCatalogClient,
  counts: Array<{ variationId: string; quantity: number }>,
): Promise<boolean> {
  if (!counts.length || !SQUARE_LOCATION_ID) return false
  const occurredAt = new Date().toISOString()
  await client.inventory.batchCreateChanges({
    idempotencyKey: randomUUID(),
    ignoreUnchangedCounts: true,
    changes: counts.map((c) => ({
      type: 'PHYSICAL_COUNT' as const,
      physicalCount: {
        catalogObjectId: c.variationId,
        state: 'IN_STOCK' as const,
        locationId: SQUARE_LOCATION_ID,
        quantity: String(Math.max(0, Math.floor(c.quantity))),
        occurredAt,
      },
    })),
  })
  return true
}

/**
 * Ensure Square POS item matches Staff/online for this Wix product:
 * category, image (if Square has none), SKUs/variations, inventory from CoveInventory/Wix.
 */
export async function ensureSquarePosProductFromWix(
  productId: string,
  opts?: { force?: boolean; forceImage?: boolean },
): Promise<SquarePosSyncResult> {
  const id = String(productId || '').trim()
  if (!id) return { ok: false, skipped: true, reason: 'no product id' }
  if (!process.env.SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
    return { ok: false, skipped: true, reason: 'Square not configured' }
  }

  const cfg = await getCatalogConfig()
  let onInventory = false
  let invByKey = new Map<string, number>()
  try {
    const { listCoveInventory } = await import('@/lib/cove-inventory')
    const rows = await listCoveInventory()
    onInventory = rows.some((r) => r.productId === id)
    for (const r of rows) {
      if (r.productId !== id) continue
      invByKey.set(r.productId, r.quantity)
      if (r.variantId) invByKey.set(`${r.productId}:${r.variantId}`, r.quantity)
    }
  } catch {
    onInventory = false
  }

  const onSpirit = cfg.spiritWearProductIds.has(id)
  const onCove = cfg.storeProductIds.has(id) || onInventory
  if (!opts?.force && !onSpirit && !onCove) {
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
              inventoryItem?: { quantity?: number }
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

  const plans: VariantPlan[] = []
  let missingSkuCount = 0
  for (const v of variants) {
    const sku = String(v.sku || '')
      .trim()
      .toUpperCase()
    if (!sku) {
      missingSkuCount++
      continue
    }
    const price =
      v.price?.actualPrice?.amount ??
      (product.price as { actualPrice?: { amount?: string } } | undefined)?.actualPrice
        ?.amount ??
      '0'
    const staffQty = invByKey.get(`${id}:${String(v.id || '')}`) ?? invByKey.get(id)
    const wixQty = v.inventoryItem?.quantity
    const quantity =
      staffQty != null ? staffQty : wixQty != null ? Number(wixQty) : null
    plans.push({
      name: variantLabel(product as Parameters<typeof variantLabel>[0], v),
      sku,
      cents: dollarsToCents(price),
      quantity: quantity != null && Number.isFinite(quantity) ? quantity : null,
    })
  }

  if (!plans.length) {
    return {
      ok: false,
      skipped: true,
      reason: 'variants missing SKU',
      missingSkuCount,
    }
  }

  const client = squareClient()
  const bySku = await listSquareItemsBySku(client)
  const existingHit = plans.map((p) => bySku.get(p.sku)).find(Boolean)
  const existingItem = existingHit?.item ?? null

  const categoryName = onSpirit ? 'Spirit Wear' : 'Cove Snacks'
  const categoryId = await ensureCategory(client, categoryName)
  const trackAny = plans.some((p) => p.quantity != null)

  const createdSkus: string[] = []
  const existingSkus: string[] = []
  let squareItemId = existingItem?.id ?? null
  let updated = false

  if (!existingItem) {
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
          variations: plans.map((v, i) => ({
            type: 'ITEM_VARIATION' as const,
            id: `${itemId}-v${i}`,
            presentAtAllLocations: true,
            itemVariationData: {
              name: v.name,
              sku: v.sku,
              pricingType: 'FIXED_PRICING' as const,
              priceMoney: { amount: v.cents, currency: 'USD' },
              itemId,
              trackInventory: v.quantity != null,
              sellable: true,
              stockable: true,
            },
          })),
        },
      },
    })
    squareItemId = res.catalogObject?.id ?? null
    createdSkus.push(...plans.map((p) => p.sku))
    updated = true
  } else {
    const item = existingItem
    const itemId = String(item.id)
    const existingVars = [...(item.itemData?.variations || [])]
    const skuToVar = new Map(
      existingVars.map((v) => [
        String(v.itemVariationData?.sku || '')
          .trim()
          .toUpperCase(),
        v,
      ]),
    )

    const nextVariations: Array<{
      type: 'ITEM_VARIATION'
      id: string
      version?: bigint
      presentAtAllLocations?: boolean
      itemVariationData: {
        name: string
        sku: string
        pricingType: 'FIXED_PRICING'
        priceMoney: { amount: bigint; currency: 'USD' }
        itemId: string
        trackInventory: boolean
        sellable: boolean
        stockable: boolean
      }
    }> = []

    for (const plan of plans) {
      const hit = skuToVar.get(plan.sku)
      if (hit?.id) {
        existingSkus.push(plan.sku)
        nextVariations.push({
          type: 'ITEM_VARIATION',
          id: hit.id,
          version:
            hit.version == null
              ? undefined
              : typeof hit.version === 'bigint'
                ? hit.version
                : BigInt(hit.version),
          presentAtAllLocations: hit.presentAtAllLocations ?? true,
          itemVariationData: {
            name: plan.name || hit.itemVariationData?.name || 'Regular',
            sku: plan.sku,
            pricingType: 'FIXED_PRICING',
            priceMoney: { amount: plan.cents, currency: 'USD' },
            itemId,
            trackInventory:
              plan.quantity != null ? true : Boolean(hit.itemVariationData?.trackInventory),
            sellable: true,
            stockable: true,
          },
        })
        skuToVar.delete(plan.sku)
      } else {
        createdSkus.push(plan.sku)
        nextVariations.push({
          type: 'ITEM_VARIATION',
          id: `#${itemId}-v-${randomUUID().slice(0, 6)}`,
          presentAtAllLocations: true,
          itemVariationData: {
            name: plan.name,
            sku: plan.sku,
            pricingType: 'FIXED_PRICING',
            priceMoney: { amount: plan.cents, currency: 'USD' },
            itemId,
            trackInventory: plan.quantity != null || trackAny,
            sellable: true,
            stockable: true,
          },
        })
      }
    }
    // Keep leftover Square-only variations (e.g. size rows sharing a legacy SKU map)
    for (const leftover of skuToVar.values()) {
      if (!leftover.id) continue
      const sku = String(leftover.itemVariationData?.sku || '')
        .trim()
        .toUpperCase()
      if (sku) existingSkus.push(sku)
      nextVariations.push({
        type: 'ITEM_VARIATION',
        id: leftover.id,
        version:
          leftover.version == null
            ? undefined
            : typeof leftover.version === 'bigint'
              ? leftover.version
              : BigInt(leftover.version),
        presentAtAllLocations: leftover.presentAtAllLocations ?? true,
        itemVariationData: {
          name: leftover.itemVariationData?.name || 'Regular',
          sku: sku || leftover.id,
          pricingType: 'FIXED_PRICING',
          priceMoney: {
            amount: BigInt(leftover.itemVariationData?.priceMoney?.amount ?? 0),
            currency: 'USD',
          },
          itemId,
          trackInventory: Boolean(leftover.itemVariationData?.trackInventory),
          sellable: leftover.itemVariationData?.sellable ?? true,
          stockable: leftover.itemVariationData?.stockable ?? true,
        },
      })
    }

    await client.catalog.object.upsert({
      idempotencyKey: randomUUID(),
      object: {
        type: 'ITEM',
        id: itemId,
        version:
          item.version == null
            ? undefined
            : typeof item.version === 'bigint'
              ? item.version
              : BigInt(item.version),
        presentAtAllLocations: item.presentAtAllLocations ?? true,
        presentAtLocationIds: item.presentAtLocationIds ?? undefined,
        absentAtLocationIds: item.absentAtLocationIds ?? undefined,
        itemData: {
          name,
          description:
            item.itemData?.description || 'Synced from Staff Cove · shmspto.org',
          productType: 'REGULAR',
          categories: categoryId
            ? [{ id: categoryId }]
            : item.itemData?.categories || undefined,
          variations: nextVariations,
        },
      },
    })
    squareItemId = itemId
    updated = true
  }

  let imageSynced = false
  if (squareItemId) {
    // Re-read after upsert so imageIds / variation ids are current
    const fresh = (await client.catalog.object.get({
      objectId: squareItemId,
    })) as { object?: SquareItemObj }
    const item = fresh.object
    const imageUrl = getWixProductImageUrl(product)
    if (opts?.forceImage && item?.itemData?.imageIds?.length) {
      // forceImage: still upload as primary replacement
      const imgRes = await fetch(imageUrl || '')
      if (imageUrl && imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer())
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
        const blob = new Blob([buf], { type: contentType })
        const file = new File([blob], `wix-force.${contentType.includes('png') ? 'png' : 'jpg'}`, {
          type: contentType,
        })
        await client.catalog.images.create({
          request: {
            idempotencyKey: randomUUID(),
            objectId: squareItemId,
            isPrimary: true,
            image: {
              type: 'IMAGE',
              id: `#img-${randomUUID().slice(0, 8)}`,
              imageData: { name: 'Staff / online catalog' },
            },
          },
          imageFile: file,
        })
        imageSynced = true
      }
    } else {
      imageSynced = await ensurePrimaryImage(
        client,
        squareItemId,
        imageUrl,
        item?.itemData?.imageIds,
      )
    }

    const freshVars = item?.itemData?.variations || []
    const skuToId = new Map(
      freshVars.map((v) => [
        String(v.itemVariationData?.sku || '')
          .trim()
          .toUpperCase(),
        String(v.id || ''),
      ]),
    )
    const counts: Array<{ variationId: string; quantity: number }> = []
    for (const plan of plans) {
      if (plan.quantity == null) continue
      const matching = freshVars.filter(
        (v) =>
          String(v.itemVariationData?.sku || '')
            .trim()
            .toUpperCase() === plan.sku,
      )
      if (matching.length) {
        for (const v of matching) {
          if (v.id) counts.push({ variationId: v.id, quantity: plan.quantity })
        }
      } else {
        const vid = skuToId.get(plan.sku)
        if (vid) counts.push({ variationId: vid, quantity: plan.quantity })
      }
    }

    const inventorySynced = await syncInventoryCounts(client, counts)
    return {
      ok: true,
      createdSkus,
      existingSkus,
      missingSkuCount,
      squareItemId,
      categorySynced: Boolean(categoryId),
      imageSynced,
      inventorySynced,
      updated,
    }
  }

  return {
    ok: true,
    createdSkus,
    existingSkus,
    missingSkuCount,
    squareItemId,
    categorySynced: Boolean(categoryId),
    imageSynced,
    updated,
  }
}

/** Best-effort; never throws to callers that must not fail Staff product writes. */
export async function syncWixProductToSquareBestEffort(
  productId: string,
  opts?: { force?: boolean; forceImage?: boolean },
): Promise<SquarePosSyncResult> {
  try {
    const result = await ensureSquarePosProductFromWix(productId, opts)
    if (result.createdSkus?.length || result.updated) {
      console.info('Square POS sync', productId, {
        created: result.createdSkus,
        category: result.categorySynced,
        image: result.imageSynced,
        inventory: result.inventorySynced,
      })
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
