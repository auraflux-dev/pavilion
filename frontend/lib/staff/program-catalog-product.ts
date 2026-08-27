/**
 * Enrichment tuition as Wix Stores catalog products (same price home as
 * memberships / Cove). Programs CMS keeps roster + ops; productId links the SKU.
 *
 * Not added to Cove/Spirit allowlists — sold via program checkout, not /cove.
 */
import { fetchCatalogProductDetail } from '@/lib/catalog-price'

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

export type ProgramCatalogSyncResult = {
  productId: string
  created: boolean
  price: number
  name: string
  sku: string
}

function slugSkuPart(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
}

/** Stable SKU for enrichment catalog rows. */
export function programCatalogSku(input: {
  programId: string
  name: string
  season?: string
}): string {
  const season = slugSkuPart(input.season || 'EP') || 'EP'
  const namePart = slugSkuPart(input.name) || 'CLASS'
  const idPart = input.programId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()
  return `EP-${season}-${namePart}-${idPart}`.slice(0, 40)
}

async function getProductRaw(productId: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${WIX_PRODUCTS}/${productId}`, {
    headers: wixHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = (await res.json()) as { product?: Record<string, unknown> }
  return (data.product ?? data) as Record<string, unknown>
}

/**
 * Create or update the Wix Stores product that owns list tuition for a program.
 * Returns null when fee is 0 (no catalog SKU) or Wix is not configured.
 */
export async function ensureProgramCatalogProduct(input: {
  programId: string
  name: string
  fee: number
  season?: string
  existingProductId?: string | null
}): Promise<ProgramCatalogSyncResult | null> {
  if (!process.env.WIX_API_KEY || !process.env.WIX_SITE_ID) return null

  const name = input.name.trim()
  const fee = Number(input.fee)
  if (!name || !Number.isFinite(fee) || fee <= 0) return null

  const sku = programCatalogSku({
    programId: input.programId,
    name,
    season: input.season,
  })
  const priceAmount = fee.toFixed(2)
  const existingId = String(input.existingProductId ?? '').trim()

  if (existingId) {
    const product = await getProductRaw(existingId)
    if (product) {
      const revision = String(product.revision ?? '1')
      const variants =
        ((product.variantsInfo as { variants?: Array<Record<string, unknown>> } | undefined)
          ?.variants as Array<Record<string, unknown>> | undefined) ?? []
      const variant = variants[0]
      if (!variant?.id) {
        throw new Error('Enrichment catalog product has no price variant')
      }
      const res = await fetch(`${WIX_PRODUCTS_INV}/${existingId}`, {
        method: 'PATCH',
        headers: wixHeaders(),
        body: JSON.stringify({
          product: {
            id: existingId,
            revision,
            name,
            visible: true,
            visibleInPos: false,
            variantsInfo: {
              variants: [
                {
                  id: variant.id,
                  sku,
                  visible: true,
                  price: { actualPrice: { amount: priceAmount } },
                  inventoryItem: {
                    quantity: 9999,
                  },
                },
              ],
            },
          },
        }),
      })
      const text = await res.text()
      if (!res.ok) throw new Error(`Catalog update failed: ${text.slice(0, 280)}`)
      return {
        productId: existingId,
        created: false,
        price: fee,
        name,
        sku,
      }
    }
  }

  const res = await fetch(WIX_PRODUCTS_INV, {
    method: 'POST',
    headers: wixHeaders(),
    body: JSON.stringify({
      product: {
        name,
        visible: true,
        visibleInPos: false,
        productType: 'PHYSICAL',
        physicalProperties: {},
        plainDescription: `Enrichment tuition · ${name}. Sold via Programs registration (not Cove).`,
        variantsInfo: {
          variants: [
            {
              sku,
              visible: true,
              price: { actualPrice: { amount: priceAmount } },
              inventoryItem: {
                quantity: 9999,
              },
            },
          ],
        },
      },
    }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Catalog create failed: ${text.slice(0, 280)}`)
  const data = JSON.parse(text) as { product?: { id?: string } }
  const productId = String(data.product?.id ?? '').trim()
  if (!productId) throw new Error('Catalog create returned no product id')

  return {
    productId,
    created: true,
    price: fee,
    name,
    sku,
  }
}

/** List fee from catalog when linked; otherwise CMS fee. */
export async function resolveProgramListFee(program: {
  fee?: number | null
  productId?: string | null
}): Promise<number> {
  const productId = String(program.productId ?? '').trim()
  if (productId) {
    const detail = await fetchCatalogProductDetail(productId)
    if (detail && detail.price > 0) return detail.price
  }
  return Number(program.fee ?? 0) || 0
}
