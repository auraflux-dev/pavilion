/**
 * Square POS (Stand / phone app) → Staff ledger + inventory.
 * Matches line items by catalog SKU → Wix product variants.
 */
import { SquareClient, SquareEnvironment } from 'square'
import { getWixClient } from '@/lib/wix-client'
import { decrementCoveInventory } from '@/lib/cove-inventory'
import { getCatalogConfig } from '@/lib/api/catalog-config'
import { SQUARE_LOCATION_ID } from '@/lib/square'

export type PosSyncLine = {
  sku: string
  name: string
  qty: number
  unitCents: number
  productId?: string
  variantId?: string
}

export type PosSyncResult = {
  ok: boolean
  skipped?: boolean
  reason?: string
  paymentId: string
  totalDollars?: number
  lines?: PosSyncLine[]
  alreadyProcessed?: boolean
}

type WixVariantHit = {
  productId: string
  variantId: string
  name: string
  sku: string
  quantity: number | null
  revision: string
}

function squareClient() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN
  if (!accessToken) throw new Error('SQUARE_ACCESS_TOKEN is not set')
  return new SquareClient({
    token: accessToken,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  })
}

async function listPosVariantIndex(): Promise<Map<string, WixVariantHit>> {
  const cfg = await getCatalogConfig()
  const ids = Array.from(
    new Set([...cfg.spiritWearProductIds, ...cfg.storeProductIds]),
  )
  const bySku = new Map<string, WixVariantHit>()
  if (!ids.length) return bySku

  const siteId = process.env.WIX_SITE_ID
  const apiKey = process.env.WIX_API_KEY
  if (!siteId || !apiKey) return bySku

  for (const productId of ids) {
    try {
      const res = await fetch(`https://www.wixapis.com/stores/v3/products/${productId}`, {
        headers: { Authorization: apiKey, 'wix-site-id': siteId },
      })
      if (!res.ok) continue
      const product = (await res.json()).product as {
        id?: string
        name?: string
        revision?: string
        options?: Array<{
          id?: string
          choicesSettings?: { choices?: Array<{ choiceId?: string; name?: string }> }
        }>
        variantsInfo?: {
          variants?: Array<{
            id?: string
            sku?: string
            inventoryItem?: { quantity?: number }
            choices?: Array<{
              optionChoiceIds?: { optionId?: string; choiceId?: string }
              optionChoiceNames?: { choiceName?: string }
            }>
          }>
        }
      }
      const labelMap = new Map<string, string>()
      for (const opt of product.options ?? []) {
        for (const c of opt.choicesSettings?.choices ?? []) {
          if (opt.id && c.choiceId && c.name) {
            labelMap.set(`${opt.id}:${c.choiceId}`, c.name)
          }
        }
      }
      for (const v of product.variantsInfo?.variants ?? []) {
        const sku = String(v.sku ?? '')
          .trim()
          .toUpperCase()
        if (!sku || !v.id) continue
        const choiceLabel =
          v.choices
            ?.map((c) => {
              if (c.optionChoiceNames?.choiceName) return c.optionChoiceNames.choiceName
              const oid = c.optionChoiceIds?.optionId
              const cid = c.optionChoiceIds?.choiceId
              return oid && cid ? labelMap.get(`${oid}:${cid}`) || '' : ''
            })
            .filter(Boolean)
            .join(' · ') || ''
        bySku.set(sku, {
          productId: String(product.id),
          variantId: String(v.id),
          name: choiceLabel
            ? `${product.name} · ${choiceLabel}`
            : String(product.name ?? sku),
          sku,
          quantity:
            v.inventoryItem?.quantity != null ? Number(v.inventoryItem.quantity) : null,
          revision: String(product.revision ?? '1'),
        })
      }
    } catch (err) {
      console.warn('POS index skip', productId, err)
    }
  }
  return bySku
}

async function decrementWixVariantQty(hit: WixVariantHit, qty: number): Promise<void> {
  const siteId = process.env.WIX_SITE_ID
  const apiKey = process.env.WIX_API_KEY
  if (!siteId || !apiKey) return

  const invRes = await fetch('https://www.wixapis.com/stores/v3/inventory-items/query', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'wix-site-id': siteId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: {
        filter: {
          productId: { $eq: hit.productId },
          variantId: { $eq: hit.variantId },
        },
        paging: { limit: 5 },
      },
    }),
  })
  const invJson = (await invRes.json()) as {
    inventoryItems?: Array<{
      id: string
      revision?: string
      quantity?: number
      trackQuantity?: boolean
    }>
  }
  const row = invJson.inventoryItems?.[0]
  if (!row?.id) return

  const current = Math.max(0, Number(row.quantity) || 0)
  const next = Math.max(0, current - qty)
  await fetch(`https://www.wixapis.com/stores/v3/inventory-items/${row.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: apiKey,
      'wix-site-id': siteId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inventoryItem: {
        id: row.id,
        revision: row.revision,
        quantity: next,
        trackQuantity: true,
      },
    }),
  })
}

type SquareLine = {
  name: string
  quantity: string
  catalogObjectId?: string
  variationName?: string
  basePriceMoney?: { amount?: bigint | number | string }
  note?: string
}

async function resolveSkuForCatalogObject(catalogObjectId: string): Promise<string> {
  const client = squareClient()
  try {
    const res = await client.catalog.object.get({ objectId: catalogObjectId })
    const obj = (res as { object?: { itemVariationData?: { sku?: string } } }).object
    return String(obj?.itemVariationData?.sku ?? '')
      .trim()
      .toUpperCase()
  } catch {
    return ''
  }
}

async function resolveBuyerEmail(
  client: ReturnType<typeof squareClient>,
  payment: Record<string, unknown>,
): Promise<string> {
  const customerId = String(payment.customerId ?? '').trim()
  if (customerId) {
    try {
      const res = await client.customers.get({ customerId })
      const email = String(
        (res as { customer?: { emailAddress?: string } }).customer?.emailAddress ?? '',
      )
        .trim()
        .toLowerCase()
      if (email.includes('@')) return email
    } catch (err) {
      console.warn('POS sync: customer lookup failed', customerId, err)
    }
  }
  const buyer = String(payment.buyerEmailAddress ?? '').trim().toLowerCase()
  if (buyer.includes('@')) return buyer
  return 'guest@register.local'
}

/**
 * Fulfill a completed Square POS payment into Staff Payments + inventory.
 * Idempotent on Payments.transactionId = paymentId.
 */
export async function fulfillSquarePosPayment(paymentId: string): Promise<PosSyncResult> {
  const id = String(paymentId || '').trim()
  if (!id) return { ok: false, skipped: true, reason: 'no payment id', paymentId: '' }

  const client = squareClient()
  const wix = getWixClient()

  const prior = await wix.items.query('Payments').eq('transactionId', id).limit(5).find()
  if ((prior.items ?? []).length > 0) {
    const row = prior.items[0] as { amount?: number; source?: string }
    return {
      ok: true,
      alreadyProcessed: true,
      paymentId: id,
      totalDollars: Number(row.amount) || 0,
      reason: String(row.source || 'existing'),
    }
  }

  const payRes = await client.payments.get({ paymentId: id })
  const payment = (payRes as { payment?: Record<string, unknown> }).payment
  if (!payment) {
    return { ok: false, skipped: true, reason: 'payment not found', paymentId: id }
  }

  const status = String(payment.status ?? '')
  if (status !== 'COMPLETED') {
    return { ok: true, skipped: true, reason: `status ${status}`, paymentId: id }
  }

  const locationId = String(payment.locationId ?? '')
  if (SQUARE_LOCATION_ID && locationId && locationId !== SQUARE_LOCATION_ID) {
    return { ok: true, skipped: true, reason: 'other location', paymentId: id }
  }

  const note = String(payment.note ?? '')
  const ref = String(payment.referenceId ?? '')
  if (
    /membership|store.?card|cove.?reload|donation|checkout/i.test(`${note} ${ref}`) ||
    ref.startsWith('topoff:')
  ) {
    return { ok: true, skipped: true, reason: 'non-POS payment', paymentId: id }
  }

  const orderId = String(payment.orderId ?? '')
  let squareLines: SquareLine[] = []
  if (orderId) {
    try {
      const ord = await client.orders.get({ orderId })
      const order = (ord as { order?: { lineItems?: SquareLine[] } }).order
      squareLines = order?.lineItems ?? []
    } catch (err) {
      console.warn('POS sync: order fetch failed', orderId, err)
    }
  }

  if (!squareLines.length) {
    const amountCents = Number(
      (payment.amountMoney as { amount?: number | string | bigint } | undefined)?.amount ?? 0,
    )
    const totalDollars = amountCents / 100
    const parentEmail = await resolveBuyerEmail(client, payment)
    await wix.items.insert('Payments', {
      parentEmail,
      amount: totalDollars,
      status: 'Paid',
      paymentDate: new Date().toISOString(),
      paymentMethod: 'Square Stand',
      transactionId: id,
      source: 'square_pos_stand',
      programName: 'In-person sales (Square Stand)',
      notes: `Stand sale · no catalog lines · ${note || 'open amount'}`.trim(),
    })
    return { ok: true, paymentId: id, totalDollars, lines: [] }
  }

  const index = await listPosVariantIndex()
  const lines: PosSyncLine[] = []

  for (const li of squareLines) {
    const qty = Math.max(1, Math.floor(Number(li.quantity) || 1))
    let sku = ''
    if (li.catalogObjectId) {
      sku = await resolveSkuForCatalogObject(li.catalogObjectId)
    }
    const unitCents = Number(li.basePriceMoney?.amount ?? 0)
    const display = [li.name, li.variationName].filter(Boolean).join(' · ')
    const hit = sku ? index.get(sku) : undefined
    lines.push({
      sku: sku || 'UNKNOWN',
      name: hit?.name || display || 'Item',
      qty,
      unitCents,
      productId: hit?.productId,
      variantId: hit?.variantId,
    })
  }

  const invLines = lines
    .filter((l) => l.productId)
    .map((l) => ({
      productId: l.productId!,
      variantId: l.variantId,
      qty: l.qty,
    }))
  if (invLines.length) {
    try {
      await decrementCoveInventory(invLines)
    } catch (err) {
      console.warn('POS sync CoveInventory', err)
    }
    for (const l of lines) {
      if (!l.productId || !l.variantId) continue
      const hit = index.get(l.sku)
      if (!hit) continue
      try {
        await decrementWixVariantQty(hit, l.qty)
      } catch (err) {
        console.warn('POS sync Wix inventory', l.sku, err)
      }
    }
  }

  const totalDollars =
    Number(
      (payment.amountMoney as { amount?: number | string | bigint } | undefined)?.amount ?? 0,
    ) / 100
  const summary = lines.map((l) => `${l.qty}× ${l.name}`).join(', ')
  const unmatched = lines.filter((l) => !l.productId).map((l) => l.name)
  const parentEmail = await resolveBuyerEmail(client, payment)

  await wix.items.insert('Payments', {
    parentEmail,
    amount: totalDollars,
    status: unmatched.length ? 'Paid · review inventory' : 'Paid',
    paymentDate: new Date().toISOString(),
    paymentMethod: 'Square Stand',
    transactionId: id,
    source: 'square_pos_stand',
    programName: 'In-person sales (Square Stand)',
    notes: [
      summary,
      unmatched.length ? `Unmatched SKUs (ledger only): ${unmatched.join(', ')}` : '',
      note ? `Square note: ${note}` : '',
      parentEmail !== 'guest@register.local' ? `Square customer ${parentEmail}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
  })

  return { ok: true, paymentId: id, totalDollars, lines }
}
