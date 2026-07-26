/**
 * Headless Wix eCom checkout. creates a checkout + hosted checkout URL.
 * Used because the published Wix site template has no /product-page routes.
 * Product/variant IDs come from SiteSettings via getCatalogConfig().
 */
import { createClient, ApiKeyStrategy } from '@wix/sdk'
import { checkout } from '@wix/ecom'
import { getCatalogConfig, isAllowedStoreCardAmount } from '@/lib/api/catalog-config'

const STORES_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e'

function getAdminClient() {
  const siteId = process.env.WIX_SITE_ID
  const apiKey = process.env.WIX_API_KEY
  if (!siteId || !apiKey) throw new Error('WIX_SITE_ID and WIX_API_KEY required')
  return createClient({
    modules: { checkout },
    auth: ApiKeyStrategy({ siteId, apiKey }),
  })
}

async function resolveFirstVariantId(productId: string): Promise<string | null> {
  const res = await fetch(`https://www.wixapis.com/stores/v3/products/${productId}`, {
    headers: {
      Authorization: process.env.WIX_API_KEY!,
      'wix-site-id': process.env.WIX_SITE_ID!,
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  const variants = data.product?.variantsInfo?.variants ?? []
  const visible = variants.find((v: { visible?: boolean }) => v.visible !== false)
  return (visible ?? variants[0])?.id ?? null
}

export async function createCheckoutUrl(opts: {
  productId: string
  variantId?: string | null
  quantity?: number
  postFlowUrl?: string
  /** Applied at create; empty = none. Store-card checkouts should omit and lock. */
  couponCode?: string | null
  /** When true, shopper cannot add/change coupons on the hosted checkout page. */
  lockCouponCode?: boolean
}): Promise<string> {
  const client = getAdminClient()
  const variantId = opts.variantId || (await resolveFirstVariantId(opts.productId))
  const catalogReference: {
    appId: string
    catalogItemId: string
    options?: { variantId: string }
  } = {
    appId: STORES_APP_ID,
    catalogItemId: opts.productId,
  }
  if (variantId) {
    catalogReference.options = { variantId }
  }

  const coupon = (opts.couponCode ?? '').trim().toUpperCase()
  const created = await client.checkout.createCheckout({
    lineItems: [
      {
        quantity: opts.quantity ?? 1,
        catalogReference,
      },
    ],
    channelType: 'WEB',
    ...(coupon ? { couponCode: coupon } : {}),
    ...(opts.lockCouponCode
      ? { customSettings: { lockCouponCode: true } }
      : {}),
  })
  const checkoutEntity = (created as { checkout?: { _id?: string }; _id?: string }).checkout ?? created
  const checkoutId =
    (checkoutEntity as { _id?: string })._id ||
    (created as { checkout?: { id?: string } }).checkout?.id
  if (!checkoutId) throw new Error('Checkout created without id')

  // Preferred: sessionized headless URL with return path
  try {
    const { redirects } = await import('@wix/redirects')
    const { createClient: makeClient, OAuthStrategy } = await import('@wix/sdk')
    const visitor = makeClient({
      modules: { redirects },
      auth: OAuthStrategy({ clientId: process.env.NEXT_PUBLIC_WIX_CLIENT_ID! }),
    })
    const tokens = await visitor.auth.generateVisitorTokens()
    visitor.auth.setTokens(tokens)
    const red = await visitor.redirects.createRedirectSession({
      ecomCheckout: { checkoutId },
      callbacks: {
        postFlowUrl:
          opts.postFlowUrl ||
          `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shmspto.org'}/membership`,
      },
    })
    const fullUrl = red.redirectSession?.fullUrl
    if (fullUrl) return fullUrl
  } catch {
    // fall through to plain checkout URL
  }

  const urlRes = await client.checkout.getCheckoutUrl(checkoutId)
  const url = (urlRes as { checkoutUrl?: string }).checkoutUrl
  if (!url) throw new Error('Missing checkoutUrl')
  return url
}

export async function membershipCheckoutRedirectUrl(
  tier: string,
  postFlowUrl?: string
): Promise<string> {
  const { getMembershipCheckoutProduct } = await import('@/lib/membership-sync')
  const product = await getMembershipCheckoutProduct(tier)
  if (!product?.productId) {
    throw new Error(
      `No Wix product configured for membership tier "${tier}". Set productId on the Membership Tiers CMS row or membership*ProductId in Site Settings.`
    )
  }
  return createCheckoutUrl({
    productId: product.productId,
    variantId: product.variantId || null,
    postFlowUrl,
 // Discount codes are for enrichment programs later. not membership checkout
    lockCouponCode: true,
  })
}

export async function storeCardCheckoutRedirectUrl(
  amount: number,
  postFlowUrl?: string
): Promise<string> {
  const cfg = await getCatalogConfig()
  if (!isAllowedStoreCardAmount(amount, cfg)) {
    throw new Error(`Unsupported store card amount: ${amount}`)
  }
  return createCheckoutUrl({
    productId: cfg.storeCardProductId,
    variantId: cfg.storeCardVariantByAmount[amount],
    postFlowUrl:
      postFlowUrl ||
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shmspto.org'}/cove`,
    // Never allow discount codes on store-card purchases
    lockCouponCode: true,
  })
}

export async function productCheckoutRedirectUrl(
  productId: string,
  postFlowUrl?: string,
  couponCode?: string | null
): Promise<string> {
  return createCheckoutUrl({
    productId,
    postFlowUrl:
      postFlowUrl ||
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shmspto.org'}/cove`,
    couponCode,
  })
}
