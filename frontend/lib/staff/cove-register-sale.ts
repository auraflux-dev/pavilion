import { decrementCoveInventory } from '@/lib/cove-inventory'
import { listInPersonSellProducts } from '@/lib/staff/cove-products'

export type RegisterLineIn = { productId: string; variantId?: string; qty: number }

export type PricedRegisterLine = {
  productId: string
  variantId?: string
  name: string
  qty: number
  unitPrice: number
  lineTotal: number
}

export function normalizeRegisterLines(lines: RegisterLineIn[]): RegisterLineIn[] {
  return lines
    .map((l) => ({
      productId: String(l.productId ?? '').trim(),
      variantId: l.variantId ? String(l.variantId).trim() : undefined,
      qty: Math.floor(Number(l.qty) || 0),
    }))
    .filter((l) => l.productId && l.qty > 0)
}

/** Price cart lines against the live Cove register catalog. */
export async function priceRegisterCart(lines: RegisterLineIn[]): Promise<{
  priced: PricedRegisterLine[]
  totalDollars: number
  totalCents: number
}> {
  const normalized = normalizeRegisterLines(lines)
  if (!normalized.length) {
    throw Object.assign(new Error('No valid line items'), { status: 400 })
  }

  const catalog = await listInPersonSellProducts()
  const byKey = new Map(catalog.map((p) => [`${p.id}:${p.variantId || ''}`, p] as const))
  const byProductOnly = new Map(catalog.map((p) => [p.id, p] as const))

  const priced: PricedRegisterLine[] = []
  for (const line of normalized) {
    const product =
      byKey.get(`${line.productId}:${line.variantId || ''}`) ||
      (!line.variantId ? byProductOnly.get(line.productId) : undefined)
    if (!product) {
      throw Object.assign(new Error(`Unknown product ${line.productId}`), { status: 400 })
    }
    if (!product.available) {
      throw Object.assign(new Error(`${product.name} is out of stock`), { status: 400 })
    }
    if (product.quantity != null && product.quantity < line.qty) {
      throw Object.assign(new Error(`Insufficient stock for ${product.name}`), { status: 400 })
    }
    const lineTotal = Math.round(product.price * line.qty * 100) / 100
    priced.push({
      productId: product.id,
      variantId: product.variantId || line.variantId,
      name: product.name,
      qty: line.qty,
      unitPrice: product.price,
      lineTotal,
    })
  }

  const totalDollars = Math.round(priced.reduce((sum, l) => sum + l.lineTotal, 0) * 100) / 100
  const totalCents = Math.round(totalDollars * 100)
  if (totalCents <= 0) {
    throw Object.assign(new Error('Cart total must be positive'), { status: 400 })
  }

  return { priced, totalDollars, totalCents }
}

export async function decrementPricedInventory(priced: PricedRegisterLine[]) {
  await decrementCoveInventory(
    priced.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      qty: l.qty,
    })),
  )
}

export function registerLineSummary(priced: PricedRegisterLine[]) {
  return priced.map((l) => `${l.qty}× ${l.name}`).join(', ')
}
