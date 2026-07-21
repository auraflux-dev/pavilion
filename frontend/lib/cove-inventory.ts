/**
 * Cove snack inventory tracked in CMS CoveInventory (productId, variantId, sku, quantity).
 * Falls back to Wix inStock-only when no inventory row exists.
 */
import { getWixClient } from '@/lib/wix-client'

export type CoveInventoryRow = {
  _id?: string
  productId: string
  variantId?: string
  name?: string
  sku?: string
  quantity: number
  active?: boolean
}

export async function listCoveInventory(): Promise<CoveInventoryRow[]> {
  const client = getWixClient()
  try {
    const result = await client.items.query('CoveInventory').limit(200).find()
    return ((result.items ?? []) as Array<Record<string, unknown>>)
      .map((row) => ({
        _id: String(row._id ?? ''),
        productId: String(row.productId ?? ''),
        variantId: String(row.variantId ?? '').trim() || undefined,
        name: String(row.name ?? ''),
        sku: String(row.sku ?? '').trim().toUpperCase(),
        quantity: Math.max(0, Number(row.quantity) || 0),
        active: row.active !== false,
      }))
      .filter((r) => r.productId && r.active !== false)
  } catch {
    return []
  }
}

export async function findInventoryBySkuOrProductId(
  skuOrId: string
): Promise<CoveInventoryRow | null> {
  const key = skuOrId.trim()
  if (!key) return null
  const rows = await listCoveInventory()
  const upper = key.toUpperCase()
  return (
    rows.find((r) => r.sku && r.sku === upper) ||
    rows.find((r) => r.productId === key) ||
    null
  )
}

function matchInventoryRow(
  rows: CoveInventoryRow[],
  productId: string,
  variantId?: string
): CoveInventoryRow | undefined {
  if (variantId) {
    const exact = rows.find(
      (r) => r.productId === productId && r.variantId === variantId
    )
    if (exact) return exact
  }
  const productRows = rows.filter((r) => r.productId === productId)
  if (productRows.length === 1) return productRows[0]
  return productRows.find((r) => !r.variantId)
}

/** Decrement stock for product lines. Throws if a tracked row would go negative. */
export async function decrementCoveInventory(
  lines: Array<{ productId: string; variantId?: string; qty: number }>
): Promise<void> {
  if (!lines.length) return
  const client = getWixClient()
  const rows = await listCoveInventory()

  for (const line of lines) {
    const row = matchInventoryRow(rows, line.productId, line.variantId)
    if (!row?._id) continue
    if (row.quantity < line.qty) {
      throw new Error(`Insufficient stock for ${row.name || line.productId}`)
    }
  }

  for (const line of lines) {
    const row = matchInventoryRow(rows, line.productId, line.variantId)
    if (!row?._id) continue
    const next = row.quantity - line.qty
    try {
      await client.items.update('CoveInventory', {
        ...row,
        _id: row._id,
        quantity: next,
      } as Parameters<typeof client.items.update>[1])
      row.quantity = next
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : `Could not update inventory for ${line.productId}`
      )
    }
  }
}
