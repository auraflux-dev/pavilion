/**
 * Staff Cove catalog. create/update Wix Stores products from /staff
 * so retail does not need the Wix Dashboard for snacks or spirit wear.
 *
 * Supports: photos (Media Manager), single-option variants (Flavor/Size),
 * Cove + Spirit allowlists, and CoveInventory qty/SKU per variant.
 */
import { getCatalogConfig } from '@/lib/api/catalog-config'
import { CATALOG_DEFAULTS } from '@/lib/defaults/catalog'
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
 /** On /cove snack & store menu (storeProductIds). */
 onCove: boolean
 /** On /cove/spirit-wear + Spirit register lane (spiritWearProductIds). */
 onSpirit: boolean
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

function choiceLabelMap(raw: Record<string, unknown>): Map<string, string> {
  const map = new Map<string, string>()
  const options = (raw.options as Array<Record<string, unknown>> | undefined) ?? []
  for (const opt of options) {
    const optionId = String(opt.id ?? '')
    const choices =
      ((opt.choicesSettings as { choices?: Array<Record<string, unknown>> } | undefined)
        ?.choices as Array<Record<string, unknown>> | undefined) ?? []
    for (const c of choices) {
      const choiceId = String(c.choiceId ?? c.id ?? '')
      const name = String(c.name ?? c.key ?? '').trim()
      if (optionId && choiceId && name) map.set(`${optionId}:${choiceId}`, name)
    }
  }
  return map
}

function variantLabel(
  variant: Record<string, unknown>,
  labels?: Map<string, string>,
): string {
  const choices =
    (variant.choices as Array<{
      optionChoiceNames?: { choiceName?: string }
      choiceName?: string
      optionChoiceIds?: { optionId?: string; choiceId?: string }
    }> | undefined) ?? []
  const fromNames = choices
    .map((c) => c.optionChoiceNames?.choiceName || c.choiceName || '')
    .map((s) => String(s).trim())
    .filter(Boolean)
  if (fromNames.length) return fromNames.join(' / ')
  if (labels?.size) {
    const fromIds = choices
      .map((c) => {
        const optionId = String(c.optionChoiceIds?.optionId ?? '')
        const choiceId = String(c.optionChoiceIds?.choiceId ?? '')
        return labels.get(`${optionId}:${choiceId}`) || ''
      })
      .filter(Boolean)
    if (fromIds.length) return fromIds.join(' / ')
  }
  return 'Default'
}

async function readAllowlist(): Promise<string[]> {
 const cfg = await getCatalogConfig()
 return Array.from(cfg.storeProductIds)
}

async function writeAllowlist(ids: string[]): Promise<void> {
 const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)))
 await upsertSiteSetting('storeProductIds', unique.join(','))
}

async function readSpiritAllowlist(): Promise<string[]> {
 const cfg = await getCatalogConfig()
 return Array.from(cfg.spiritWearProductIds)
}

async function writeSpiritAllowlist(ids: string[]): Promise<void> {
 const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)))
 await upsertSiteSetting('spiritWearProductIds', unique.join(','))
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

export async function addToSpiritAllowlist(productId: string): Promise<void> {
 const ids = await readSpiritAllowlist()
 if (!ids.includes(productId)) {
 ids.push(productId)
 await writeSpiritAllowlist(ids)
 }
}

export async function removeFromSpiritAllowlist(productId: string): Promise<void> {
 const ids = await readSpiritAllowlist()
 await writeSpiritAllowlist(ids.filter((id) => id !== productId))
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
 const labels = choiceLabelMap(raw)
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
 label: variantLabel(variant, labels),
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
 spirit: Set<string>,
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
 onSpirit: spirit.has(id),
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
 const spirit = new Set(await readSpiritAllowlist())
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
 return mapProduct(raw, allow, spirit, invByKey)
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
 const aListed = a.onCove || a.onSpirit
 const bListed = b.onCove || b.onSpirit
 if (aListed !== bListed) return aListed ? -1 : 1
 if (a.onSpirit !== b.onSpirit) return a.onSpirit ? -1 : 1
 if (a.onCove !== b.onCove) return a.onCove ? -1 : 1
 return a.name.localeCompare(b.name)
 })
}

export type RegisterProductLine = {
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
  /** Spirit (and multi-option) items: pick size/color after tapping the product tile. */
  optionName?: string
  variants?: Array<{
    id: string
    label: string
    price: number
    sku: string
    quantity: number | null
    available: boolean
  }>
}

/** Flatten products already selected for in-person selling (snacks + spirit, etc.).
 * Spirit: one tile per product + variants for a picker (not one tile per size/color).
 * Snacks: one tile per sellable variant line.
 */
export function flattenRegisterProducts(
  products: StaffCoveProduct[],
  opts?: { spiritIds?: Set<string>; spiritOrder?: string[] },
): RegisterProductLine[] {
  const spiritIds = opts?.spiritIds ?? new Set<string>()
  const spiritOrder = opts?.spiritOrder ?? []
  const orderIndex = new Map(spiritOrder.map((id, i) => [id, i]))
  const lines: RegisterProductLine[] = []

  for (const p of products) {
    const isSpirit = spiritIds.has(p.id)
    const variants = p.variants.length ? p.variants : []

    if (isSpirit) {
      const sellable = variants
        .map((v) => {
          const available = v.quantity == null ? p.wixInStock : v.quantity > 0
          return {
            id: v.id,
            label: v.label && v.label !== 'Default' ? v.label : v.sku || 'Option',
            price: v.price,
            sku: v.sku || p.sku || '',
            quantity: v.quantity,
            available,
          }
        })
        .filter((v) => v.available || variants.length <= 1)

      const anyAvailable =
        sellable.some((v) => v.available) || (variants.length === 0 && p.wixInStock)
      if (!anyAvailable && sellable.length === 0) continue

      const primary = sellable.find((v) => v.available) ?? sellable[0]
      lines.push({
        id: p.id,
        variantId: primary?.id ?? p.variantId ?? '',
        name: p.name,
        price: primary?.price ?? p.price,
        category: 'Spirit',
        sku: primary?.sku || p.sku || p.id.slice(0, 8).toUpperCase(),
        quantity: primary?.quantity ?? p.quantity,
        available: true,
        image: p.image,
        featured: Boolean(p.featured),
        dealLabel: p.dealLabel,
        optionName: p.optionName || (sellable.length > 1 ? 'Option' : undefined),
        variants: sellable.length > 1 ? sellable : undefined,
      })
      continue
    }

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
        category: p.onCove ? 'Snacks' : 'Merch',
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
    if (a.category !== b.category) {
      if (a.category === 'Snacks') return -1
      if (b.category === 'Snacks') return 1
      return a.category.localeCompare(b.category)
    }
    if (a.category === 'Spirit' && b.category === 'Spirit') {
      const ai = orderIndex.has(a.id) ? orderIndex.get(a.id)! : 999
      const bi = orderIndex.has(b.id) ? orderIndex.get(b.id)! : 999
      if (ai !== bi) return ai - bi
    }
    return a.name.localeCompare(b.name)
  })
}

/**
 * Membership dues + Cove Digital Card *load* products. never sold as table tiles.
 * Spirit wear and Cove snacks are in-person sellable.
 */
export async function registerBlockedProductIds(): Promise<Set<string>> {
  const cfg = await getCatalogConfig()
  const ids = new Set<string>()
  ids.add(cfg.storeCardProductId)
  for (const entry of Object.values(cfg.membershipByTier)) {
    if (entry.productId) ids.add(entry.productId)
  }
  const d = CATALOG_DEFAULTS
  ids.add(d.storeCardProductId)
  if (d.membershipRubyProductId) ids.add(d.membershipRubyProductId)
  if (d.membershipSupremeProductId) ids.add(d.membershipSupremeProductId)
  if (d.membershipPearlProductId) ids.add(d.membershipPearlProductId)
  return ids
}

/** In-person catalog: Cove snacks allowlist + spirit wear, minus membership / card-load SKUs. */
export async function listInPersonSellProducts() {
  const [products, blocked, cfg] = await Promise.all([
    listStaffCoveProducts(),
    registerBlockedProductIds(),
    getCatalogConfig(),
  ])
  const spiritOrder = Array.from(cfg.spiritWearProductIds)
  // Prefer CMS/default list order (Set iteration order follows insertion in parseIdList)
  const sellable = products.filter(
    (p) => !blocked.has(p.id) && (p.onCove || cfg.spiritWearProductIds.has(p.id)),
  )
  return flattenRegisterProducts(sellable, {
    spiritIds: cfg.spiritWearProductIds,
    spiritOrder,
  })
}

/** Short uppercase SKU from a product / variant name (Staff never has to invent these). */
export function slugifyCoveSku(raw: string): string {
  const cleaned = String(raw || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28)
  return cleaned || 'ITEM'
}

export async function collectExistingCoveSkus(): Promise<Set<string>> {
  const products = await listStaffCoveProducts()
  const used = new Set<string>()
  for (const p of products) {
    const primary = String(p.sku || '')
      .trim()
      .toUpperCase()
    if (primary) used.add(primary)
    for (const v of p.variants || []) {
      const sku = String(v.sku || '')
        .trim()
        .toUpperCase()
      if (sku) used.add(sku)
    }
  }
  return used
}

export function allocateUniqueCoveSku(base: string, used: Set<string>): string {
  const root = slugifyCoveSku(base)
  if (!used.has(root)) {
    used.add(root)
    return root
  }
  for (let i = 2; i < 200; i++) {
    const candidate = `${root.slice(0, 24)}-${i}`
    if (!used.has(candidate)) {
      used.add(candidate)
      return candidate
    }
  }
  const fallback = `${root.slice(0, 18)}-${Date.now().toString(36).toUpperCase()}`
  used.add(fallback)
  return fallback
}

function ensureVariantSkus(
  productName: string,
  variants: StaffCoveVariantInput[],
  used: Set<string>,
): StaffCoveVariantInput[] {
  return variants.map((v) => {
    const existing = String(v.sku ?? '')
      .trim()
      .toUpperCase()
    if (existing) {
      used.add(existing)
      return { ...v, sku: existing }
    }
    const base =
      variants.length > 1 && v.label.trim() && v.label.trim().toLowerCase() !== 'default'
        ? `${productName}-${v.label}`
        : productName
    return { ...v, sku: allocateUniqueCoveSku(base, used) }
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
 showOnSpirit?: boolean
 imageUrl?: string
 imageMediaId?: string
 optionName?: string
 variants?: StaffCoveVariantInput[]
}): Promise<StaffCoveProduct> {
 const name = input.name.trim()
 if (!name) throw new Error('Name is required')

  const multiRaw =
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

  for (const v of multiRaw) {
    if (!v.label.trim()) throw new Error('Each variant needs a label')
    if (!Number.isFinite(Number(v.price)) || Number(v.price) <= 0) {
      throw new Error(`Price must be greater than 0 for “${v.label}”`)
    }
  }

  const usedSkus = await collectExistingCoveSkus()
  const multi = ensureVariantSkus(name, multiRaw, usedSkus)

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
 if (input.showOnSpirit === true) {
 await addToSpiritAllowlist(productId)
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
 showOnSpirit?: boolean
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
    const usedSkus = await collectExistingCoveSkus()
    // Allow keeping this product's own SKUs when re-saving
    for (const ev of existingVariants) {
      const s = String(ev.sku ?? '')
        .trim()
        .toUpperCase()
      if (s) usedSkus.delete(s)
    }
    const variants = ensureVariantSkus(name, input.variants, usedSkus)
    const optionName =
      input.optionName?.trim() ||
      existingOptions[0]?.name?.trim() ||
      'Option'
    const useOptions = variants.length > 1 || Boolean(optionName)
    if (useOptions && variants.length >= 1) {
      Object.assign(
        patchProduct,
        buildOptionAndVariants(optionName, variants, existingVariants)
      )
    } else {
      const v = variants[0]
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
    let sku =
      input.sku != null
        ? String(input.sku).trim().toUpperCase()
        : String(variant.sku ?? '').trim().toUpperCase()
    if (!sku) {
      const usedSkus = await collectExistingCoveSkus()
      for (const ev of existingVariants) {
        const s = String(ev.sku ?? '')
          .trim()
          .toUpperCase()
        if (s) usedSkus.delete(s)
      }
      sku = allocateUniqueCoveSku(name, usedSkus)
    }
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
 if (input.showOnSpirit === true) await addToSpiritAllowlist(id)
 if (input.showOnSpirit === false) await removeFromSpiritAllowlist(id)

 const refreshed = await getProductRaw(id)
 const mapped = mapProduct(
 refreshed,
 new Set(await readAllowlist()),
 new Set(await readSpiritAllowlist()),
 invByKey,
 )
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

async function removeCoveInventoryForProduct(productId: string): Promise<void> {
  const client = getWixClient()
  try {
    const existing = await client.items
      .query('CoveInventory')
      .eq('productId', productId)
      .limit(100)
      .find()
    for (const row of existing.items ?? []) {
      const id = String((row as { _id?: string })._id ?? '')
      if (id) await client.items.remove('CoveInventory', id)
    }
  } catch (err) {
    console.warn('CoveInventory cleanup skipped:', err)
  }
}

/** Permanently delete a Cove catalog product (Wix + allowlist + inventory rows). */
export async function deleteStaffCoveProduct(productId: string): Promise<void> {
  const id = productId.trim()
  if (!id) throw new Error('Product id required')

  await removeFromCoveAllowlist(id)
  await removeFromSpiritAllowlist(id)
  await removeCoveInventoryForProduct(id)

  const res = await fetch(`${WIX_PRODUCTS}/${id}`, {
    method: 'DELETE',
    headers: wixHeaders(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Delete failed: ${text.slice(0, 300)}`)
  }
}

/** Assign unique SKUs to every Cove catalog variant that is still blank. */
export async function backfillMissingCoveSkus(): Promise<{
  updated: Array<{ id: string; name: string; skus: string[] }>
  skipped: number
}> {
  const products = await listStaffCoveProducts()
  const used = await collectExistingCoveSkus()
  const updated: Array<{ id: string; name: string; skus: string[] }> = []
  let skipped = 0

  for (const p of products) {
    const blanks = p.variants.filter((v) => !String(v.sku || '').trim())
    if (blanks.length === 0) {
      skipped += 1
      continue
    }

    for (const v of p.variants) {
      const s = String(v.sku || '')
        .trim()
        .toUpperCase()
      if (s) used.delete(s)
    }

    const variants: StaffCoveVariantInput[] = p.variants.map((v) => ({
      id: v.id,
      label: v.label,
      price: v.price,
      sku: v.sku || undefined,
      quantity: v.quantity ?? undefined,
    }))
    const withSkus = ensureVariantSkus(p.name, variants, used)

    await updateStaffCoveProduct({
      id: p.id,
      variants: withSkus,
      optionName: p.optionName || undefined,
    })

    updated.push({
      id: p.id,
      name: p.name,
      skus: withSkus.map((v) => String(v.sku || '')),
    })
  }

  return { updated, skipped }
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
