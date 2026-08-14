/**
 * Spirit wear / hoodie size demand from in-person tables.
 * When a size is out of stock, staff log interest so retail can reorder.
 */
import { getWixClient } from '@/lib/wix-client'

export type SpiritDemandStatus = 'open' | 'ordered' | 'fulfilled' | 'cancelled'

export type SpiritWearDemand = {
  id: string
  parentName: string
  parentEmail: string
  parentPhone: string
  coveFamilyCode: string
  productId: string
  productName: string
  variantId: string
  sizeLabel: string
  sku: string
  qty: number
  eventNote: string
  notes: string
  status: SpiritDemandStatus
  source: string
  createdByEmail: string
  createdAt: string
  updatedAt: string
}

export type SpiritDemandRollup = {
  key: string
  productName: string
  sizeLabel: string
  sku: string
  openQty: number
  openCount: number
}

const COLLECTION = 'SpiritWearDemand'
const STATUSES: SpiritDemandStatus[] = ['open', 'ordered', 'fulfilled', 'cancelled']

function mapRow(row: Record<string, unknown>): SpiritWearDemand {
  const statusRaw = String(row.status ?? 'open').toLowerCase()
  const status = (STATUSES.includes(statusRaw as SpiritDemandStatus)
    ? statusRaw
    : 'open') as SpiritDemandStatus
  return {
    id: String(row._id ?? ''),
    parentName: String(row.parentName ?? ''),
    parentEmail: String(row.parentEmail ?? '').trim().toLowerCase(),
    parentPhone: String(row.parentPhone ?? ''),
    coveFamilyCode: String(row.coveFamilyCode ?? ''),
    productId: String(row.productId ?? ''),
    productName: String(row.productName ?? ''),
    variantId: String(row.variantId ?? ''),
    sizeLabel: String(row.sizeLabel ?? ''),
    sku: String(row.sku ?? ''),
    qty: Math.max(1, Math.round(Number(row.qty) || 1)),
    eventNote: String(row.eventNote ?? ''),
    notes: String(row.notes ?? ''),
    status,
    source: String(row.source ?? 'register'),
    createdByEmail: String(row.createdByEmail ?? '').trim().toLowerCase(),
    createdAt: String(row.createdAt ?? row._createdDate ?? ''),
    updatedAt: String(row.updatedAt ?? ''),
  }
}

export function rollupOpenDemand(items: SpiritWearDemand[]): SpiritDemandRollup[] {
  const map = new Map<string, SpiritDemandRollup>()
  for (const item of items) {
    if (item.status !== 'open') continue
    const key = `${item.productName.trim().toLowerCase()}|${item.sizeLabel.trim().toLowerCase()}|${item.sku}`
    const existing = map.get(key)
    if (existing) {
      existing.openQty += item.qty
      existing.openCount += 1
    } else {
      map.set(key, {
        key,
        productName: item.productName || 'Unknown product',
        sizeLabel: item.sizeLabel || 'Unknown size',
        sku: item.sku,
        openQty: item.qty,
        openCount: 1,
      })
    }
  }
  return [...map.values()].sort((a, b) => {
    const byProduct = a.productName.localeCompare(b.productName)
    if (byProduct) return byProduct
    return a.sizeLabel.localeCompare(b.sizeLabel)
  })
}

export async function listSpiritWearDemand(opts?: {
  status?: SpiritDemandStatus | 'all'
}): Promise<SpiritWearDemand[]> {
  const client = getWixClient()
  const res = await client.items.query(COLLECTION).descending('_createdDate').limit(200).find()
  const items = (res.items ?? []).map((r) => mapRow(r as Record<string, unknown>))
  const status = opts?.status ?? 'all'
  if (status === 'all') return items
  return items.filter((i) => i.status === status)
}

export async function createSpiritWearDemand(input: {
  parentName: string
  parentEmail?: string
  parentPhone?: string
  coveFamilyCode?: string
  productId?: string
  productName: string
  variantId?: string
  sizeLabel: string
  sku?: string
  qty?: number
  eventNote?: string
  notes?: string
  source?: string
  createdByEmail: string
}): Promise<SpiritWearDemand> {
  const productName = String(input.productName ?? '').trim()
  const sizeLabel = String(input.sizeLabel ?? '').trim()
  const parentName = String(input.parentName ?? '').trim()
  if (!productName) throw new Error('Product is required')
  if (!sizeLabel) throw new Error('Size is required')
  if (!parentName) throw new Error('Parent name is required')

  const now = new Date().toISOString()
  const row = {
    parentName,
    parentEmail: String(input.parentEmail ?? '').trim().toLowerCase(),
    parentPhone: String(input.parentPhone ?? '').trim(),
    coveFamilyCode: String(input.coveFamilyCode ?? '').trim(),
    productId: String(input.productId ?? '').trim(),
    productName,
    variantId: String(input.variantId ?? '').trim(),
    sizeLabel,
    sku: String(input.sku ?? '').trim(),
    qty: Math.max(1, Math.round(Number(input.qty) || 1)),
    eventNote: String(input.eventNote ?? '').trim(),
    notes: String(input.notes ?? '').trim(),
    status: 'open' as SpiritDemandStatus,
    source: String(input.source ?? 'register').trim() || 'register',
    createdByEmail: String(input.createdByEmail ?? '').trim().toLowerCase(),
    createdAt: now,
    updatedAt: now,
    active: true,
  }

  const client = getWixClient()
  const inserted = await client.items.insert(COLLECTION, row)
  return mapRow({ ...(inserted as Record<string, unknown>), ...row })
}

export async function setSpiritWearDemandStatus(
  id: string,
  status: SpiritDemandStatus,
): Promise<SpiritWearDemand> {
  if (!id.trim()) throw new Error('Demand id required')
  if (!STATUSES.includes(status)) throw new Error('Invalid status')
  const client = getWixClient()
  const found = await client.items.query(COLLECTION).eq('_id', id).limit(1).find()
  const existing = found.items?.[0] as Record<string, unknown> | undefined
  if (!existing) throw new Error('Demand not found')
  const patch = {
    ...existing,
    status,
    updatedAt: new Date().toISOString(),
  }
  const updated = await client.items.update(COLLECTION, patch as never)
  return mapRow(updated as Record<string, unknown>)
}
