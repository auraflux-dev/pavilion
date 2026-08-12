/**
 * Resolve Wix Catalog product (+ optional variant) price and choice labels.
 */
export type CatalogVariant = {
  id: string
  label: string
  price: number
  sku: string
}

export type CatalogProductDetail = {
  id: string
  name: string
  price: number
  image?: string
  optionName?: string
  variants: CatalogVariant[]
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

function productImage(product: Record<string, unknown>): string | undefined {
  try {
    const media = product.media as Record<string, unknown> | undefined
    if (!media) return undefined
    const main = media.main as Record<string, unknown> | undefined
    const mainImage = main?.image as { url?: string; id?: string } | undefined
    return (
      wixMediaIdToUrl(mainImage?.url) ??
      wixMediaIdToUrl(mainImage?.id) ??
      wixMediaIdToUrl(main?.id)
    )
  } catch {
    return undefined
  }
}

function choiceLabelMap(product: Record<string, unknown>): Map<string, string> {
  const map = new Map<string, string>()
  const options = (product.options as Array<Record<string, unknown>> | undefined) ?? []
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
  labels: Map<string, string>,
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
  const fromIds = choices
    .map((c) => {
      const optionId = c.optionChoiceIds?.optionId
      const choiceId = c.optionChoiceIds?.choiceId
      if (!optionId || !choiceId) return ''
      return labels.get(`${optionId}:${choiceId}`) || ''
    })
    .filter(Boolean)
  if (fromIds.length) return fromIds.join(' / ')
  const sku = String(variant.sku ?? '').trim()
  if (sku) return sku
  return 'Default'
}

export async function fetchCatalogProductDetail(
  productId: string,
): Promise<CatalogProductDetail | null> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId || !productId) return null

  try {
    const res = await fetch(
      `https://www.wixapis.com/stores/v3/products/${productId}?fields=MEDIA_ITEMS_INFO`,
      {
        headers: {
          Authorization: apiKey,
          'wix-site-id': siteId,
        },
        cache: 'no-store',
      },
    )
    if (!res.ok) return null
    const data = await res.json()
    const product = (data.product ?? data) as Record<string, unknown>
    const name = String(product?.name ?? 'Product')
    const labels = choiceLabelMap(product)
    const rawVariants =
      ((product.variantsInfo as { variants?: Array<Record<string, unknown>> } | undefined)
        ?.variants as Array<Record<string, unknown>> | undefined) ?? []

    const variants: CatalogVariant[] = rawVariants
      .filter((v) => v.visible !== false)
      .map((v) => {
        const priceRaw =
          (v.price as { actualPrice?: { amount?: string } } | undefined)?.actualPrice?.amount ??
          '0'
        return {
          id: String(v.id ?? ''),
          label: variantLabel(v, labels),
          price: parseFloat(String(priceRaw)) || 0,
          sku: String(v.sku ?? '').trim(),
        }
      })
      .filter((v) => v.id && v.price > 0)

    const optionName = String(
      ((product.options as Array<{ name?: string }> | undefined) ?? [])[0]?.name ?? '',
    ).trim()

    let price = variants[0]?.price ?? 0
    if (price === 0) {
      const min = (product.actualPriceRange as { minValue?: { amount?: string } } | undefined)
        ?.minValue?.amount
      price = parseFloat(String(min ?? '0')) || 0
    }
    if (!Number.isFinite(price) || price <= 0) return null

    return {
      id: productId,
      name,
      price,
      image: productImage(product),
      optionName: optionName || undefined,
      variants,
    }
  } catch {
    return null
  }
}

export async function fetchCatalogProductPrice(productId: string): Promise<{
  name: string
  price: number
} | null> {
  const detail = await fetchCatalogProductDetail(productId)
  if (!detail) return null
  return { name: detail.name, price: detail.price }
}

export async function fetchCatalogVariantPrice(
  productId: string,
  variantId: string,
): Promise<{ name: string; price: number; variantLabel: string; sku: string } | null> {
  const detail = await fetchCatalogProductDetail(productId)
  if (!detail) return null
  const variant = detail.variants.find((v) => v.id === variantId)
  if (!variant) return null
  return {
    name: detail.name,
    price: variant.price,
    variantLabel: variant.label,
    sku: variant.sku,
  }
}
