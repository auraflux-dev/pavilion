/**
 * Headless Wix eCom checkout — creates a checkout + hosted checkout URL.
 * Used because the published Wix site template has no /product-page routes.
 */
import { createClient, ApiKeyStrategy } from '@wix/sdk'
import { checkout } from '@wix/ecom'
import {
  MEMBERSHIP_RUBY_PRODUCT_ID,
  MEMBERSHIP_SUPREME_PRODUCT_ID,
  STORE_CARD_PRODUCT_ID,
} from '@/lib/wix-checkout'

const STORES_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e'

/** Catalog V3 default variants (single-variant memberships). */
const MEMBERSHIP_VARIANTS: Record<'ruby' | 'supreme', { productId: string; variantId: string }> = {
  ruby: {
    productId: MEMBERSHIP_RUBY_PRODUCT_ID,
    variantId: '23ea8122-e8b0-4eea-912f-c4227308193d',
  },
  supreme: {
    productId: MEMBERSHIP_SUPREME_PRODUCT_ID,
    variantId: '1bfd31dd-32e6-4781-9083-97168e82cb1d',
  },
}

/** Store card Amount options currently in Catalog ($10 / $20 / $25). */
const STORE_CARD_VARIANTS: Record<10 | 20 | 25, string> = {
  10: 'c30c1bf1-a771-427c-85f9-d67317fe785d',
  20: 'bddb2f05-4ce4-4d41-848a-f6b3dc9bf478',
  25: '24000231-2b43-4dee-8434-695f3034858d',
}

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

  const created = await client.checkout.createCheckout({
    lineItems: [
      {
        quantity: opts.quantity ?? 1,
        catalogReference,
      },
    ],
    channelType: 'WEB',
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
          `${process.env.NEXT_PUBLIC_SITE_URL || 'https://frontend-six-rho-48.vercel.app'}/membership`,
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
  tier: 'ruby' | 'supreme',
  postFlowUrl?: string
): Promise<string> {
  const { productId, variantId } = MEMBERSHIP_VARIANTS[tier]
  return createCheckoutUrl({ productId, variantId, postFlowUrl })
}

export async function storeCardCheckoutRedirectUrl(
  amount: 10 | 20 | 25,
  postFlowUrl?: string
): Promise<string> {
  return createCheckoutUrl({
    productId: STORE_CARD_PRODUCT_ID,
    variantId: STORE_CARD_VARIANTS[amount],
    postFlowUrl:
      postFlowUrl ||
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://frontend-six-rho-48.vercel.app'}/store`,
  })
}

export async function productCheckoutRedirectUrl(
  productId: string,
  postFlowUrl?: string
): Promise<string> {
  return createCheckoutUrl({
    productId,
    postFlowUrl:
      postFlowUrl ||
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://frontend-six-rho-48.vercel.app'}/spirit-wear`,
  })
}
