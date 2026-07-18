/**
 * Resolve Wix Catalog product price (USD dollars) for server-side charge verification.
 */
export async function fetchCatalogProductPrice(productId: string): Promise<{
  name: string
  price: number
} | null> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId || !productId) return null

  try {
    const res = await fetch(`https://www.wixapis.com/stores/v3/products/${productId}`, {
      headers: {
        Authorization: apiKey,
        'wix-site-id': siteId,
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const product = data.product ?? data
    const name = String(product?.name ?? 'Product')

    let price = 0
    const mpv = product?.variantSummary?.minPriceVariant
    const amt = mpv?.price?.actualPrice?.amount
    if (amt != null) price = parseFloat(String(amt)) || 0

    if (price === 0) {
      const min = product?.price?.actualPriceRange?.minValue?.amount
      if (min != null) price = parseFloat(String(min)) || 0
    }

    if (price === 0) {
      const variants = product?.variantsInfo?.variants ?? []
      const first = variants.find((v: { visible?: boolean }) => v.visible !== false) ?? variants[0]
      const vAmt = first?.price?.actualPrice?.amount ?? first?.price?.amount
      if (vAmt != null) price = parseFloat(String(vAmt)) || 0
    }

    if (!Number.isFinite(price) || price <= 0) return null
    return { name, price }
  } catch {
    return null
  }
}
