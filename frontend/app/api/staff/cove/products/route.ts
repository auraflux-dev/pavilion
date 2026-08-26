/**
 * GET  /api/staff/cove/products. list catalog (+ Cove / Spirit allowlists + inventory)
 * POST /api/staff/cove/products. create product in Wix + optional Cove/Spirit allowlists
 * PATCH /api/staff/cove/products. update fields + showOnCove / showOnSpirit
 * DELETE /api/staff/cove/products. remove from Wix + both allowlists + inventory
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  backfillMissingCoveSkus,
  createStaffCoveProduct,
  deleteStaffCoveProduct,
  listInPersonSellProducts,
  listStaffCoveProducts,
  updateStaffCoveProduct,
  type StaffCoveVariantInput,
} from '@/lib/staff/cove-products'
import { listCoveInventory } from '@/lib/cove-inventory'
import { syncWixProductToSquareBestEffort } from '@/lib/square-pos-catalog-sync'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

export const dynamic = 'force-dynamic'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['retail', 'admin'])) return null
  return session
}

function parseVariants(raw: unknown): StaffCoveVariantInput[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  return raw.map((v) => {
    const row = v as Record<string, unknown>
    return {
      id: row.id != null ? String(row.id) : undefined,
      label: String(row.label ?? row.name ?? ''),
      price: Number(row.price),
      sku: row.sku != null ? String(row.sku) : undefined,
      quantity: row.quantity != null ? Number(row.quantity) : undefined,
    }
  })
}

export async function GET(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const mode = req.nextUrl.searchParams.get('mode')

  try {
    if (mode === 'register') {
      const [registerProducts, inventory] = await Promise.all([
        listInPersonSellProducts(),
        listCoveInventory(),
      ])
      const invBySku = new Map(
        inventory.filter((r) => r.sku).map((r) => [r.sku!, r] as const)
      )

      return NextResponse.json({
        products: registerProducts,
        skuIndex: Object.fromEntries(
          [...invBySku.entries()].map(([sku, row]) => [
            sku,
            {
              productId: row.productId,
              variantId: row.variantId || '',
              name: row.name,
              quantity: row.quantity,
            },
          ])
        ),
      })
    }

    const products = await listStaffCoveProducts()
    return NextResponse.json({ products })
  } catch (err) {
    console.error('cove products GET', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load products' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const product = await createStaffCoveProduct({
      name: String(body.name ?? ''),
      price: Number(body.price),
      quantity: Number(body.quantity ?? 0),
      sku: body.sku != null ? String(body.sku) : undefined,
      showOnCove: body.showOnCove !== false,
      showOnSpirit: body.showOnSpirit === true,
      imageUrl: body.imageUrl != null ? String(body.imageUrl) : undefined,
      imageMediaId: body.imageMediaId != null ? String(body.imageMediaId) : undefined,
      optionName: body.optionName != null ? String(body.optionName) : undefined,
      variants: parseVariants(body.variants),
    })
    const squareSync = await syncWixProductToSquareBestEffort(product.id)
    return NextResponse.json({ ok: true, product, squareSync })
  } catch (err) {
    console.error('cove products POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Create failed' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()

    if (body.backfillSkus === true) {
      const result = await backfillMissingCoveSkus()
      const squareResults = []
      for (const row of result.updated) {
        squareResults.push({
          id: row.id,
          name: row.name,
          skus: row.skus,
          squareSync: await syncWixProductToSquareBestEffort(row.id),
        })
      }
      return NextResponse.json({
        ok: true,
        backfill: { skipped: result.skipped, updated: squareResults },
      })
    }

    if (body.syncSquare === true && typeof body.id === 'string' && body.id.trim()) {
      const squareSync = await syncWixProductToSquareBestEffort(body.id.trim(), {
        force: true,
        forceImage: body.forceImage === true,
      })
      return NextResponse.json({ ok: true, squareSync })
    }

    const product = await updateStaffCoveProduct({
      id: String(body.id ?? ''),
      name: body.name != null ? String(body.name) : undefined,
      price: body.price != null ? Number(body.price) : undefined,
      quantity: body.quantity != null ? Number(body.quantity) : undefined,
      sku: body.sku != null ? String(body.sku) : undefined,
      showOnCove: typeof body.showOnCove === 'boolean' ? body.showOnCove : undefined,
      showOnSpirit: typeof body.showOnSpirit === 'boolean' ? body.showOnSpirit : undefined,
      visible: typeof body.visible === 'boolean' ? body.visible : undefined,
      imageUrl: body.imageUrl != null ? String(body.imageUrl) : undefined,
      imageMediaId: body.imageMediaId != null ? String(body.imageMediaId) : undefined,
      optionName: body.optionName != null ? String(body.optionName) : undefined,
      variants: parseVariants(body.variants),
    })
    // Sync when shown on Cove/Spirit, stock/image/SKU/price/variants change

    const shouldSync =
      body.showOnCove === true ||
      body.showOnSpirit === true ||
      body.sku != null ||
      body.price != null ||
      body.quantity != null ||
      body.imageUrl != null ||
      body.imageMediaId != null ||
      body.variants != null ||
      product.onCove ||
      product.onSpirit
    const squareSync = shouldSync
      ? await syncWixProductToSquareBestEffort(product.id)
      : { ok: true, skipped: true, reason: 'no Square-relevant fields' }
    return NextResponse.json({ ok: true, product, squareSync })
  } catch (err) {
    console.error('cove products PATCH', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json().catch(() => ({}))
    const id =
      typeof body?.id === 'string'
        ? body.id
        : req.nextUrl.searchParams.get('id') || ''
    if (!id.trim()) {
      return NextResponse.json({ error: 'Product id required' }, { status: 400 })
    }
    await deleteStaffCoveProduct(id)
    return NextResponse.json({ ok: true, id: id.trim() })
  } catch (err) {
    console.error('cove products DELETE', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 }
    )
  }
}
