import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { lookupFamilyByCoveCode } from '@/lib/cove-family-code'
import { decrementCoveInventory } from '@/lib/cove-inventory'
import { syncFamilyStoreCard } from '@/lib/family-store-card'
import { getGiftCardBalance, redeemGiftCard } from '@/lib/square'
import {
  flattenRegisterProducts,
  listStaffCoveProducts,
} from '@/lib/staff/cove-products'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { getWixClient } from '@/lib/wix-client'

export const dynamic = 'force-dynamic'

type LineIn = { productId: string; variantId?: string; qty: number }

/**
 * POST /api/staff/cove/checkout
 * Body: { code, lines: [{ productId, variantId?, qty }], idempotencyKey? }
 * Redeems Square gift card + decrements CoveInventory when tracked.
 */
export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['retail', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const code = String(body.code ?? '').trim()
    const lines = (Array.isArray(body.lines) ? body.lines : []) as LineIn[]
    const idempotencyKey = String(body.idempotencyKey ?? randomUUID()).slice(0, 45)

    if (!code || !lines.length) {
      return NextResponse.json({ error: 'code and lines required' }, { status: 400 })
    }

    const normalized = lines
      .map((l) => ({
        productId: String(l.productId ?? '').trim(),
        variantId: l.variantId ? String(l.variantId).trim() : undefined,
        qty: Math.floor(Number(l.qty) || 0),
      }))
      .filter((l) => l.productId && l.qty > 0)

    if (!normalized.length) {
      return NextResponse.json({ error: 'No valid line items' }, { status: 400 })
    }

    const family = await lookupFamilyByCoveCode(code)
    if (!family?.gan) {
      return NextResponse.json(
        { error: 'Family not found or has no Cove card loaded' },
        { status: 404 }
      )
    }

    // Idempotency guard: a retry/double-tap with the same key must not redeem or
    // decrement inventory twice. Replay the prior sale result instead.
    const client = getWixClient()
    const priorSale = await client.items
      .query('Payments')
      .eq('transactionId', idempotencyKey)
      .eq('source', 'cove_register_redeem')
      .limit(1)
      .find()
    if ((priorSale.items ?? []).length > 0) {
      const prior = priorSale.items[0] as { amount?: number }
      const liveBalance = await getGiftCardBalance(family.gan)
      return NextResponse.json({
        ok: true,
        total: Number(prior.amount) || 0,
        newBalance: liveBalance,
        alreadyProcessed: true,
        parentEmail: family.parentEmail,
        coveFamilyCode: family.coveFamilyCode,
      })
    }

    const catalog = flattenRegisterProducts(await listStaffCoveProducts())
    const byKey = new Map(
      catalog.map((p) => [`${p.id}:${p.variantId || ''}`, p] as const)
    )
    const byProductOnly = new Map(catalog.map((p) => [p.id, p] as const))

    const priced: Array<{
      productId: string
      variantId?: string
      name: string
      qty: number
      unitPrice: number
      lineTotal: number
    }> = []

    for (const line of normalized) {
      const product =
        byKey.get(`${line.productId}:${line.variantId || ''}`) ||
        (!line.variantId ? byProductOnly.get(line.productId) : undefined)
      if (!product) {
        return NextResponse.json(
          { error: `Unknown product ${line.productId}` },
          { status: 400 }
        )
      }
      if (!product.available) {
        return NextResponse.json(
          { error: `${product.name} is out of stock` },
          { status: 400 }
        )
      }
      if (
        product.quantity != null &&
        product.quantity < line.qty
      ) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        )
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

    const totalDollars =
      Math.round(priced.reduce((sum, l) => sum + l.lineTotal, 0) * 100) / 100
    const totalCents = Math.round(totalDollars * 100)

    if (totalCents <= 0) {
      return NextResponse.json({ error: 'Cart total must be positive' }, { status: 400 })
    }

    const liveBalance = await getGiftCardBalance(family.gan)
    if (liveBalance * 100 < totalCents) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Family has $${liveBalance.toFixed(2)}; cart is $${totalDollars.toFixed(2)}.`,
          balance: liveBalance,
        },
        { status: 402 }
      )
    }

    await decrementCoveInventory(
      priced.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        qty: l.qty,
      }))
    )

    const activity = await redeemGiftCard(family.gan, totalCents, idempotencyKey)
    const newBalance = activity?.giftCardBalanceMoney
      ? Number(activity.giftCardBalanceMoney.amount) / 100
      : liveBalance - totalDollars

    await syncFamilyStoreCard({
      parentEmail: family.parentEmail,
      gan: family.gan,
      balanceDollars: newBalance,
    })

    const studentId = family.students[0]?.id
    const lineSummary = priced.map((l) => `${l.qty}× ${l.name}`).join(', ')

    try {
      await client.items.insert('Payments', {
        parentEmail: family.parentEmail,
        studentId: studentId || undefined,
        amount: totalDollars,
        status: 'Paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: 'Cove Family Card',
        transactionId: idempotencyKey,
        source: 'cove_register_redeem',
        programName: 'The Cove. snack window',
        notes: `Code ${family.coveFamilyCode}: ${lineSummary}`,
      })
    } catch (err) {
      console.warn('Cove sale Payments insert failed:', err)
    }

    return NextResponse.json({
      ok: true,
      total: totalDollars,
      newBalance,
      lines: priced,
      parentEmail: family.parentEmail,
      coveFamilyCode: family.coveFamilyCode,
    })
  } catch (err) {
    console.error('cove checkout', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout failed' },
      { status: 500 }
    )
  }
}
