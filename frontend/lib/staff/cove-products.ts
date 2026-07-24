/**
 * Staff Cove catalog — create/update Wix Stores products from /staff
 * so retail does not need the Wix Dashboard for snack items.
 *
 * Supports: photos (Media Manager), single-option variants (Flavor/Size),
 * Cove allowlist, and CoveInventory qty/SKU per variant.
 */
import { getCatalogConfig } from '@/lib/api/catalog-config'
import { listCoveInventory } from '@/lib/cove-inventory'
import { uploadMediaBuffer } from '@/lib/social/wix-media'
import { upsertSiteSetting } from '@/lib/staff/cms-catalog'
import { getWixClient } from '@/lib/wix-client'

const WIX_PRODUCTS = 'https://www.wixapis.com/stores/v3/products'
const WIX_PRODUCTS_INV = 'https://www.wixapis.com/stores/v3/products-with-inventory'

function wixHeaders(): HeadersInit {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) throw new Error('Wix API is not configured')
  return {
    'Content-Type': 'application/json',
    Authorization: apiKey,
    'wix-site-id': siteId,
  }
}

export type StaffCoveVariant = {
  id: string
  label: string
  price: number
  sku: string
  quantity: number | null
}

export type StaffCoveProduct = {
  id: string
  revision: string
  variantId: string
  name: string
  price: number
  sku: string
  visible: boolean
  onCove: boolean
  quantity: number | null
  wixInStock: boolean
  image?: string
  optionName?: string
  /** Wix product ribbon → weekly deal on register / public Cove */
  featured?: boolean
  dealLabel?: string
  variants: StaffCoveVariant[]
}

export type StaffCoveVariantInput = {
  id?: string
  label: string
  price: number
  sku?: string
  quantity?: number
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

function getProductImage(raw: Record<string, unknown>): string | undefined {
  try {
    const media = raw.media as Record<string, unknown> | undefined
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

function variantLabel(variant: Record<string, unknown>): string {
  const choices =
    (variant.choices as Array<{
      optionChoiceNames?: { choiceName?: string }
      choiceName?: string
    }> | undefined) ?? []
  const labels = choices
    .map((c) => c.optionChoiceNames?.choiceName || c.choiceName || '')
    .map((s) => String(s).trim())
    .filter(Boolean)
  return labels.join(' / ') || 'Default'
}

async function readAllowlist(): Promise<string[]> {
  const cfg = await getCatalogConfig()
  return Array.from(cfg.storeProductIds)
}

async function writeAllowlist(ids: string[]): Promise<void> {
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)))
  await upsertSiteSetting('storeProductIds', unique.join(','))
}

export async function addToCoveAllowlist(productId: string): Promise<void> {
  const ids = await readAllowlist()
  if (!ids.includes(productId)) {
    ids.push(productId)
    await writeAllowlist(ids)
  }
}

export async function removeFromCoveAllowlist(productId: string): Promise<void> {
  const ids = await readAllowlist()
  await writeAllowlist(ids.filter((id) => id !== productId))
}

async function upsertCoveInventoryRow(opts: {
  productId: string
  variantId: string
  name: string
  sku: string
  quantity: number
}): Promise<void> {
  const client = getWixClient()
  try {
    const existing = await client.items
      .query('CoveInventory')
      .eq('productId', opts.productId)
      .limit(50)
      .find()
    const rows = (existing.items ?? []) as Array<Record<string, unknown>>
    const row =
      rows.find((r) => String(r.variantId ?? '') === opts.variantId) ||
      (opts.variantId
        ? rows.find((r) => !r.variantId && rows.length === 1)
        : rows[0])

    const data = {
      productId: opts.productId,
      variantId: opts.variantId,
      name: opts.name,
      sku: opts.sku.trim().toUpperCase(),
      quantity: Math.max(0, Math.floor(opts.quantity)),
      active: true,
    }
    if (row?._id) {
      await client.items.update('CoveInventory', {
        ...row,
        ...data,
        _id: String(row._id),
      } as Parameters<typeof client.items.update>[1])
    } else {
      await client.items.insert(
        'CoveInventory',
        data as Parameters<typeof client.items.insert>[1]
      )
    }
  } catch (err) {
    console.warn('CoveInventory upsert skipped:', err)
  }
}

function mapVariants(
  raw: Record<string, unknown>,
  invByKey: Map<string, { quantity: number; sku: string }>
): StaffCoveVariant[] {
  const variants =
    ((raw.variantsInfo as { variants?: Array<Record<string, unknown>> } | undefined)
      ?.variants as Array<Record<string, unknown>> | undefined) ?? []

  return variants
    .map((variant) => {
      const id = String(variant.id ?? '')
      if (!id) return null
      const productId = String(raw.id ?? '')
      const priceRaw =
        (variant.price as { actualPrice?: { amount?: string } } | undefined)?.actualPrice
          ?.amount ?? '0'
      const price = parseFloat(String(priceRaw)) || 0
      const inv =
        invByKey.get(`${productId}:${id}`) ||
        invByKey.get(productId) ||
        null
      const sku = String(variant.sku ?? inv?.sku ?? '')
        .trim()
        .toUpperCase()
      const wixQty = (variant.inventoryItem as { quantity?: number } | undefined)?.quantity
      const quantity =
        inv?.quantity != null
          ? inv.quantity
          : wixQty != null
            ? Number(wixQty)
            : null
      return {
        id,
        label: variantLabel(variant),
        price,
        sku,
        quantity,
      } satisfies StaffCoveVariant
    })
    .filter((v): v is StaffCoveVariant => Boolean(v))
}

function mapProduct(
  raw: Record<string, unknown>,
  allow: Set<string>,
  invByKey: Map<string, { quantity: number; sku: string }>
): StaffCoveProduct | null {
  const id = String(raw.id ?? '')
  if (!id) return null

  const variants = mapVariants(raw, invByKey)
  const primary = variants[0]
  const options =
    (raw.options as Array<{ name?: string } | undefined> | undefined) ?? []
  const optionName = options[0]?.name?.trim() || undefined
  const availability = String(
    (raw.inventory as { availabilityStatus?: string } | undefined)?.availabilityStatus ?? ''
  )
  const ribbonName = String(
    (raw.ribbon as { name?: string } | undefined)?.name ?? ''
  ).trim()

  const priceFallback =
    parseFloat(
      String(
        (raw.actualPriceRange as { minValue?: { amount?: string } } | undefined)?.minValue
          ?.amount ?? '0'
      )
    ) || 0

  return {
    id,
    revision: String(raw.revision ?? '1'),
    variantId: primary?.id ?? '',
    name: String(raw.name ?? ''),
    price: primary?.price ?? priceFallback,
    sku: primary?.sku ?? '',
    visible: raw.visible !== false,
    onCove: allow.has(id),
    quantity: primary?.quantity ?? null,
    wixInStock: availability === 'IN_STOCK' || raw.visible === true,
    image: getProductImage(raw),
    optionName,
    featured: ribbonName.length > 0,
    dealLabel: ribbonName || undefined,
    variants:
      variants.length > 0
        ? variants
        : [
            {
              id: '',
              label: 'Default',
              price: priceFallback,
              sku: '',
              quantity: null,
            },
          ],
  }
}

async function getProductRaw(id: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${WIX_PRODUCTS}/${id}`, {
    headers: wixHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Product not found (${res.status})`)
  const data = await res.json()
  return (data.product ?? data) as Record<string, unknown>
}

async function listProductIds(): Promise<string[]> {
  const res = await fetch(`${WIX_PRODUCTS}/query`, {
    method: 'POST',
    headers: wixHeaders(),
    body: JSON.stringify({
      query: { paging: { limit: 100 } },
      fields: ['MEDIA_ITEMS_INFO', 'MIN_PRICE_VARIANT', 'MERCHANT_DATA'],
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Could not list products (${res.status})`)
  const data = (await res.json()) as { products?: Array<{ id?: string }> }
  return (data.products ?? []).map((p) => String(p.id ?? '')).filter(Boolean)
}

function inventoryKeyMap(
  inventory: Awaited<ReturnType<typeof listCoveInventory>>
): Map<string, { quantity: number; sku: string }> {
  const invByKey = new Map<string, { quantity: number; sku: string }>()
  for (const r of inventory) {
    const sku = r.sku || ''
    invByKey.set(r.productId, { quantity: r.quantity, sku })
    if (r.variantId) {
      invByKey.set(`${r.productId}:${r.variantId}`, { quantity: r.quantity, sku })
    }
  }
  return invByKey
}

export async function listStaffCoveProducts(): Promise<StaffCoveProduct[]> {
  const allow = new Set(await readAllowlist())
  const inventory = await listCoveInventory()
  const invByKey = inventoryKeyMap(inventory)
  const ids = await listProductIds()

  const products: StaffCoveProduct[] = []
  const chunk = 8
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk)
    const batch = await Promise.all(
      slice.map(async (id) => {
        try {
          const raw = await getProductRaw(id)
          return mapProduct(raw, allow, invByKey)
        } catch {
          return null
        }
      })
    )
    for (const p of batch) {
      if (p) products.push(p)
    }
  }

  return products.sort((a, b) => {
    if (a.onCove !== b.onCove) return a.onCove ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

/** Flatten products to one sellable line per variant for the register. */
export function flattenRegisterProducts(products: StaffCoveProduct[]): Array<{
  id: string
  variantId: string
  name: string
  price: number
  category: string
  sku: string
  quantity: number | null
  available: boolean
  image?: string
  featured?: boolean
  dealLabel?: string
}> {
  const lines: Array<{
    id: string
    variantId: string
    name: string
    price: number
    category: string
    sku: string
    quantity: number | null
    available: boolean
    image?: string
    featured?: boolean
    dealLabel?: string
  }> = []

  for (const p of products) {
    if (!p.onCove && !p.visible) continue
    const variants = p.variants.length ? p.variants : []
    for (const v of variants) {
      const qty = v.quantity
      const available = qty == null ? p.wixInStock : qty > 0
      if (!available) continue
      const label =
        v.label && v.label !== 'Default' ? `${p.name} · ${v.label}` : p.name
      lines.push({
        id: p.id,
        variantId: v.id,
        name: label,
        price: v.price,
        category: 'Snacks',
        sku: v.sku || p.sku || p.id.slice(0, 8).toUpperCase(),
        quantity: qty,
        available,
        image: p.image,
        featured: Boolean(p.featured),
        dealLabel: p.dealLabel,
      })
    }
  }

  return lines.sort((a, b) => {
    if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function buildOptionAndVariants(
  optionName: string,
  variants: StaffCoveVariantInput[],
  existing?: Array<Record<string, unknown>>
) {
  const name = optionName.trim() || 'Option'
  const choices = variants.map((v) => ({
    choiceType: 'CHOICE_TEXT' as const,
    name: v.label.trim(),
  }))

  const variantPayloads = variants.map((v) => {
    const existingMatch =
      (v.id && existing?.find((e) => String(e.id) === v.id)) ||
      existing?.find((e) => variantLabel(e) === v.label.trim())
    return {
      ...(existingMatch?.id ? { id: String(existingMatch.id) } : {}),
      sku: String(v.sku ?? '').trim().toUpperCase() || undefined,
      visible: true,
      choices: [
        {
          optionChoiceNames: {
            optionName: name,
            choiceName: v.label.trim(),
            renderType: 'TEXT_CHOICES',
          },
        },
      ],
      price: { actualPrice: { amount: Number(v.price).toFixed(2) } },
      inventoryItem: {
        quantity: Math.max(0, Math.floor(Number(v.quantity) || 0)),
      },
    }
  })

  return {
    options: [
      {
        name,
        optionRenderType: 'TEXT_CHOICES',
        choicesSettings: { choices },
      },
    ],
    variantsInfo: { variants: variantPayloads },
  }
}

export async function createStaffCoveProduct(input: {
  name: string
  price: number
  quantity: number
  sku?: string
  showOnCove?: boolean
  imageUrl?: string
  imageMediaId?: string
  optionName?: string
  variants?: StaffCoveVariantInput[]
}): Promise<StaffCoveProduct> {
  const name = input.name.trim()
  if (!name) throw new Error('Name is required')

  const multi =
    input.variants && input.variants.length > 0
      ? input.variants
      : [
          {
            label: 'Default',
            price: Number(input.price),
            sku: input.sku,
            quantity: input.quantity,
          },
        ]

  for (const v of multi) {
    if (!v.label.trim()) throw new Error('Each variant needs a label')
    if (!Number.isFinite(Number(v.price)) || Number(v.price) <= 0) {
      throw new Error(`Price must be greater than 0 for “${v.label}”`)
    }
  }

  const useOptions = multi.length > 1 || Boolean(input.optionName?.trim())
  const optionName = input.optionName?.trim() || 'Option'

  const productBody: Record<string, unknown> = {
    name,
    visible: true,
    visibleInPos: true,
    productType: 'PHYSICAL',
    physicalProperties: {},
  }

  if (useOptions) {
    Object.assign(productBody, buildOptionAndVariants(optionName, multi))
  } else {
    const v = multi[0]
    productBody.variantsInfo = {
      variants: [
        {
          sku: String(v.sku ?? '').trim().toUpperCase() || undefined,
          visible: true,
          price: { actualPrice: { amount: Number(v.price).toFixed(2) } },
          inventoryItem: {
            quantity: Math.max(0, Math.floor(Number(v.quantity) || 0)),
          },
        },
      ],
    }
  }

  if (input.imageMediaId || input.imageUrl) {
    productBody.media = {
      itemsInfo: {
        items: [
          input.imageMediaId
            ? { id: input.imageMediaId }
            : { url: input.imageUrl },
        ],
      },
    }
  }

  const res = await fetch(WIX_PRODUCTS_INV, {
    method: 'POST',
    headers: wixHeaders(),
    body: JSON.stringify({ product: productBody }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Create failed: ${text.slice(0, 300)}`)
  const data = JSON.parse(text) as { product: Record<string, unknown> }
  const productId = String(data.product.id)
  const createdVariants =
    ((data.product.variantsInfo as { variants?: Array<Record<string, unknown>> })
      ?.variants as Array<Record<string, unknown>> | undefined) ?? []

  if (input.showOnCove !== false) {
    await addToCoveAllowlist(productId)
  }

  for (let i = 0; i < multi.length; i++) {
    const v = multi[i]
    const created = createdVariants[i]
    const variantId = String(created?.id ?? '')
    await upsertCoveInventoryRow({
      productId,
      variantId,
      name:
        multi.length > 1 && v.label !== 'Default'
          ? `${name} · ${v.label}`
          : name,
      sku: String(v.sku ?? ''),
      quantity: Math.max(0, Math.floor(Number(v.quantity) || 0)),
    })
  }

  const listed = await listStaffCoveProducts()
  const createdProduct = listed.find((p) => p.id === productId)
  if (!createdProduct) throw new Error('Product created but could not be reloaded')
  return createdProduct
}

export async function updateStaffCoveProduct(input: {
  id: string
  name?: string
  price?: number
  quantity?: number
  sku?: string
  showOnCove?: boolean
  visible?: boolean
  imageUrl?: string
  imageMediaId?: string
  optionName?: string
  variants?: StaffCoveVariantInput[]
}): Promise<StaffCoveProduct> {
  const id = input.id.trim()
  if (!id) throw new Error('Product id required')

  const product = await getProductRaw(id)
  const revision = String(product.revision ?? '1')
  const existingVariants =
    ((product.variantsInfo as { variants?: Array<Record<string, unknown>> } | undefined)
      ?.variants as Array<Record<string, unknown>> | undefined) ?? []
  const existingOptions =
    (product.options as Array<{ name?: string }> | undefined) ?? []

  const name = input.name?.trim() || String(product.name ?? '')
  const inventory = await listCoveInventory()
  const invByKey = inventoryKeyMap(inventory)

  let patchProduct: Record<string, unknown> = {
    id,
    revision,
    name,
    visible: input.visible ?? product.visible !== false,
  }

  const touchingVariants =
    Boolean(input.variants?.length) ||
    input.price != null ||
    input.quantity != null ||
    input.sku != null

  if (input.variants && input.variants.length > 0) {
    const optionName =
      input.optionName?.trim() ||
      existingOptions[0]?.name?.trim() ||
      'Option'
    const useOptions = input.variants.length > 1 || Boolean(optionName)
    if (useOptions && input.variants.length >= 1) {
      Object.assign(
        patchProduct,
        buildOptionAndVariants(optionName, input.variants, existingVariants)
      )
    } else {
      const v = input.variants[0]
      const existing = existingVariants[0]
      if (!existing?.id) throw new Error('Product has no variant to update')
      patchProduct.variantsInfo = {
        variants: [
          {
            id: existing.id,
            sku: String(v.sku ?? '').trim().toUpperCase() || undefined,
            visible: true,
            price: { actualPrice: { amount: Number(v.price).toFixed(2) } },
            inventoryItem: {
              quantity: Math.max(0, Math.floor(Number(v.quantity) || 0)),
            },
          },
        ],
      }
    }
  } else if (touchingVariants) {
    const variant = existingVariants[0]
    if (!variant?.id) throw new Error('Product has no variant to update')
    const currentPrice =
      parseFloat(
        String(
          (variant.price as { actualPrice?: { amount?: string } } | undefined)?.actualPrice
            ?.amount ?? '0'
        )
      ) || 0
    const price =
      input.price != null && Number.isFinite(Number(input.price))
        ? Number(input.price)
        : currentPrice
    const sku =
      input.sku != null
        ? String(input.sku).trim().toUpperCase()
        : String(variant.sku ?? '').trim().toUpperCase()
    const quantity =
      input.quantity != null
        ? Math.max(0, Math.floor(Number(input.quantity) || 0))
        : undefined

    // Preserve sibling variants when only editing the primary row
    patchProduct.variantsInfo = {
      variants: existingVariants.map((v, idx) => {
        if (idx !== 0) {
          return {
            id: v.id,
            sku: v.sku,
            visible: v.visible !== false,
            choices: v.choices,
            price: v.price,
            inventoryItem: v.inventoryItem,
          }
        }
        return {
          id: variant.id,
          sku: sku || undefined,
          visible: true,
          choices: variant.choices,
          price: { actualPrice: { amount: price.toFixed(2) } },
          ...(quantity != null ? { inventoryItem: { quantity } } : {}),
        }
      }),
    }
    if (existingOptions.length) {
      patchProduct.options = existingOptions
    }
  }

  if (input.imageMediaId || input.imageUrl) {
    patchProduct.media = {
      itemsInfo: {
        items: [
          input.imageMediaId
            ? { id: input.imageMediaId }
            : { url: input.imageUrl },
        ],
      },
    }
  }

  const res = await fetch(`${WIX_PRODUCTS_INV}/${id}`, {
    method: 'PATCH',
    headers: wixHeaders(),
    body: JSON.stringify({ product: patchProduct }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Update failed: ${text.slice(0, 300)}`)

  if (input.showOnCove === true) await addToCoveAllowlist(id)
  if (input.showOnCove === false) await removeFromCoveAllowlist(id)

  const refreshed = await getProductRaw(id)
  const mapped = mapProduct(refreshed, new Set(await readAllowlist()), invByKey)
  if (!mapped) throw new Error('Product updated but could not be reloaded')

  for (const v of mapped.variants) {
    const qty =
      input.variants?.find((x) => x.id === v.id || x.label === v.label)?.quantity ??
      (input.quantity != null && mapped.variants.length === 1
        ? input.quantity
        : v.quantity ?? invByKey.get(`${id}:${v.id}`)?.quantity ?? 0)
    await upsertCoveInventoryRow({
      productId: id,
      variantId: v.id,
      name:
        mapped.variants.length > 1 && v.label !== 'Default'
          ? `${name} · ${v.label}`
          : name,
      sku:
        input.variants?.find((x) => x.id === v.id || x.label === v.label)?.sku ??
        v.sku,
      quantity: Math.max(0, Math.floor(Number(qty) || 0)),
    })
  }

  const listed = await listStaffCoveProducts()
  const updated = listed.find((p) => p.id === id)
  if (!updated) throw new Error('Product updated but could not be reloaded')
  return updated
}

export async function uploadStaffCoveProductImage(
  productId: string,
  file: { buffer: Buffer; mimeType: string; fileName: string }
): Promise<StaffCoveProduct> {
  const uploaded = await uploadMediaBuffer(file.buffer, {
    mimeType: file.mimeType,
    fileName: file.fileName,
  })
  return updateStaffCoveProduct({
    id: productId,
    imageMediaId: uploaded.id,
  })
}
