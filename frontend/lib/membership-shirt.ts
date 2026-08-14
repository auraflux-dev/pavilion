/**
 * Paid-membership Spirit Wear tee: design × size variants + inventory hold.
 *
 * Variant labels should be "Design · Size" (same pattern as long sleeve).
 * Plain size labels are treated as design "Standard".
 * Holds use CoveInventory so register/Stand cannot sell the same unit.
 */
import { getCatalogConfig } from '@/lib/api/catalog-config'
import { CATALOG_DEFAULTS } from '@/lib/defaults/catalog'
import {
  decrementCoveInventory,
  listCoveInventory,
} from '@/lib/cove-inventory'
import {
  formatMembershipShirtLabel,
  parseMembershipShirtLabel,
} from '@/lib/membership-shirt-label'

export {
  formatMembershipShirtLabel,
  parseMembershipShirtLabel,
} from '@/lib/membership-shirt-label'

const WIX_PRODUCTS = 'https://www.wixapis.com/stores/v3/products'

function wixHeaders(): HeadersInit {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) throw new Error('Wix credentials missing')
  return {
    Authorization: apiKey,
    'wix-site-id': siteId,
    'Content-Type': 'application/json',
  }
}

export type MembershipShirtOption = {
  productId: string
  variantId: string
  design: string
  size: string
  label: string
  sku: string
  quantity: number
  available: boolean
}

export type MembershipShirtDesignGroup = {
  design: string
  sizes: Array<{
    size: string
    variantId: string
    sku: string
    quantity: number
    available: boolean
    label: string
  }>
}

function choiceLabelMap(raw: Record<string, unknown>): Map<string, string> {
  const map = new Map<string, string>()
  const options = (raw.options as Array<Record<string, unknown>> | undefined) ?? []
  for (const opt of options) {
    const choices =
      (
        opt.choicesSettings as
          | { choices?: Array<Record<string, unknown>> }
          | undefined
      )?.choices ?? []
    for (const c of choices) {
      const id = String(c.choiceId ?? c.id ?? '')
      const name = String(c.name ?? c.key ?? '')
      if (id && name) map.set(id, name)
    }
  }
  return map
}

function variantDisplayLabel(
  variant: Record<string, unknown>,
  labels: Map<string, string>,
): string {
  const choices =
    (variant.choices as Array<Record<string, unknown>> | undefined) ?? []
  const names = choices
    .map((c) => {
      const optionChoiceNames = c.optionChoiceNames as
        | { choiceName?: string; optionName?: string }
        | undefined
      if (optionChoiceNames?.choiceName) return String(optionChoiceNames.choiceName)
      const choiceId = String(c.optionChoiceId ?? c.choiceId ?? '')
      return labels.get(choiceId) || ''
    })
    .filter(Boolean)
  if (names.length) return names.join(' · ')
  return String(variant.sku ?? 'Variant')
}

export async function resolveMembershipShirtProductId(): Promise<string> {
  const { getSiteSettings } = await import('@/lib/api/site-settings')
  const settings = await getSiteSettings()
  const fromSettings = settings.get('membershipShirtProductId', '').trim()
  if (fromSettings) return fromSettings
  const cfg = await getCatalogConfig()
  const firstSpirit = [...cfg.spiritWearProductIds][0]
  return (
    firstSpirit ||
    CATALOG_DEFAULTS.spiritWearProductIds.split(',')[0]!.trim()
  )
}

/**
 * Design × size checkout + inventory hold. Off by default until staff finishes
 * adding styles (SiteSettings membershipShirtDesignsEnabled = true / 1 / yes).
 */
export async function isMembershipShirtDesignsEnabled(): Promise<boolean> {
  const { getSiteSettings } = await import('@/lib/api/site-settings')
  const settings = await getSiteSettings()
  return settings.getBool('membershipShirtDesignsEnabled', false)
}

async function getProductRaw(productId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${WIX_PRODUCTS}/${productId}`, {
    headers: wixHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Membership shirt product not found (${res.status})`)
  const data = (await res.json()) as { product?: Record<string, unknown> }
  return (data.product ?? data) as Record<string, unknown>
}

export async function listMembershipShirtOptions(): Promise<{
  productId: string
  productName: string
  options: MembershipShirtOption[]
  designs: MembershipShirtDesignGroup[]
}> {
  const productId = await resolveMembershipShirtProductId()
  const [raw, inventory] = await Promise.all([
    getProductRaw(productId),
    listCoveInventory(),
  ])
  const labels = choiceLabelMap(raw)
  const variants =
    ((raw.variantsInfo as { variants?: Array<Record<string, unknown>> } | undefined)
      ?.variants as Array<Record<string, unknown>> | undefined) ?? []

  const invByVariant = new Map<string, number>()
  for (const row of inventory) {
    if (row.productId !== productId) continue
    if (row.variantId) invByVariant.set(row.variantId, row.quantity)
  }

  const options: MembershipShirtOption[] = []
  for (const variant of variants) {
    const variantId = String(variant.id ?? '')
    if (!variantId) continue
    const label = variantDisplayLabel(variant, labels)
    const { design, size } = parseMembershipShirtLabel(label)
    const wixQty = Number(
      (variant.inventoryItem as { quantity?: number } | undefined)?.quantity,
    )
    const quantity =
      invByVariant.has(variantId)
        ? invByVariant.get(variantId)!
        : Number.isFinite(wixQty)
          ? Math.max(0, wixQty)
          : 0
    options.push({
      productId,
      variantId,
      design,
      size,
      label,
      sku: String(variant.sku ?? '')
        .trim()
        .toUpperCase(),
      quantity,
      available: quantity > 0,
    })
  }

  const designMap = new Map<string, MembershipShirtDesignGroup>()
  for (const opt of options) {
    const group = designMap.get(opt.design) ?? {
      design: opt.design,
      sizes: [],
    }
    group.sizes.push({
      size: opt.size,
      variantId: opt.variantId,
      sku: opt.sku,
      quantity: opt.quantity,
      available: opt.available,
      label: opt.label,
    })
    designMap.set(opt.design, group)
  }

  const designs = [...designMap.values()]
    .map((g) => ({
      ...g,
      sizes: g.sizes.sort((a, b) => a.size.localeCompare(b.size)),
    }))
    .sort((a, b) => a.design.localeCompare(b.design))

  return {
    productId,
    productName: String(raw.name ?? 'Spirit Wear T-shirt'),
    options,
    designs,
  }
}

/**
 * Hard hold: require a CoveInventory row for this variant and decrement it.
 * Throws if missing or insufficient — call before completing membership payment.
 */
export async function holdMembershipShirtInventory(opts: {
  productId: string
  variantId: string
  qty?: number
}): Promise<void> {
  const productId = String(opts.productId || '').trim()
  const variantId = String(opts.variantId || '').trim()
  const qty = Math.max(1, Math.round(Number(opts.qty) || 1))
  if (!productId || !variantId) {
    throw new Error('Shirt design and size are required')
  }

  const rows = await listCoveInventory()
  const row = rows.find(
    (r) => r.productId === productId && r.variantId === variantId,
  )
  if (!row?._id) {
    throw new Error(
      'That shirt design/size is not tracked in Cove inventory yet. Staff: add it under The Cove → Stock setup with quantity, then try again.',
    )
  }
  if (row.quantity < qty) {
    throw new Error(
      `That shirt design/size is out of stock (${row.name || variantId}). Pick another design or size.`,
    )
  }

  await decrementCoveInventory([{ productId, variantId, qty }])
}

export async function assertMembershipShirtAvailable(opts: {
  productId: string
  variantId: string
}): Promise<MembershipShirtOption> {
  const { options } = await listMembershipShirtOptions()
  const match = options.find(
    (o) =>
      o.productId === opts.productId &&
      o.variantId === opts.variantId &&
      o.available,
  )
  if (!match) {
    throw new Error(
      'That shirt design/size is no longer available. Refresh and pick another.',
    )
  }
  return match
}
