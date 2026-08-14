/**
 * Square SDK client + Gift Card helpers.
 * All calls are server-side only. never import this in client components.
 */
import { SquareClient, SquareEnvironment } from 'square'

function getSquareClient() {
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

export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID ?? ''

/** Retrieve a gift card by GAN (the number printed/encoded on the card). */
export async function getGiftCardByGan(gan: string) {
  const client = getSquareClient()
  const result = await client.giftCards.getFromGan({ gan })
  return (result as any).giftCard ?? null
}

/** Retrieve a gift card by Square internal ID. */
export async function getGiftCardById(id: string) {
  const client = getSquareClient()
  const result = await client.giftCards.get({ id } as any)
  return (result as any).giftCard ?? null
}

/** Get balance in dollars for a gift card by GAN. Returns 0 if not found. */
export async function getGiftCardBalance(gan: string): Promise<number> {
  const card = await getGiftCardByGan(gan)
  if (!card?.balanceMoney?.amount) return 0
  return Number(card.balanceMoney.amount) / 100
}

/** Get full activity history for a gift card. */
export async function getGiftCardActivities(giftCardId: string) {
  const client = getSquareClient()
  const result = await client.giftCards.activities.list({
    giftCardId,
    locationId: SQUARE_LOCATION_ID,
  })
  // SDK returns a paginated Page: items live under `.data` (older shapes used `.giftCardActivities`).
  const activities: any[] =
    (result as any).data ?? (result as any).giftCardActivities ?? []
  return activities.map((a: any) => ({
    id: a.id,
    type: a.type,
    createdAt: a.createdAt,
    balanceMoney: a.giftCardBalanceMoney
      ? Number(a.giftCardBalanceMoney.amount ?? 0) / 100
      : null,
    loadMoney:
      a.type === 'LOAD' && a.loadActivityDetails?.amountMoney
        ? Number(a.loadActivityDetails.amountMoney.amount ?? 0) / 100
        : null,
    redeemMoney:
      a.type === 'REDEEM' && a.redeemActivityDetails?.amountMoney
        ? Number(a.redeemActivityDetails.amountMoney.amount ?? 0) / 100
        : null,
  }))
}

/**
 * Load (top-up) a gift card by GAN.
 * amountCents: amount in cents (e.g. 2000 = $20)
 * idempotencyKey: unique string to prevent double-charges
 */
export async function loadGiftCard(
  gan: string,
  amountCents: number,
  idempotencyKey: string,
  buyerPaymentInstrumentIds: string[] = ['store-card-load']
) {
  const card = await getGiftCardByGan(gan)
  if (!card?.id) throw new Error(`Gift card not found for GAN: ${gan}`)

  const client = getSquareClient()
  const result = await client.giftCards.activities.create({
    idempotencyKey,
    giftCardActivity: {
      type: 'LOAD',
      locationId: SQUARE_LOCATION_ID,
      giftCardId: card.id,
      loadActivityDetails: {
        amountMoney: { amount: BigInt(amountCents), currency: 'USD' },
        // Required by Square for custom (non-Orders-API) processing; used for compliance checks.
        buyerPaymentInstrumentIds,
        referenceId: idempotencyKey,
      },
    },
  })
  return (result as any).giftCardActivity ?? null
}

/**
 * Redeem from a gift card (website purchases).
 * amountCents: amount to deduct in cents
 */
export async function redeemGiftCard(
  gan: string,
  amountCents: number,
  idempotencyKey: string
) {
  const card = await getGiftCardByGan(gan)
  if (!card?.id) throw new Error(`Gift card not found for GAN: ${gan}`)
  if (!card.balanceMoney?.amount || Number(card.balanceMoney.amount) < amountCents) {
    throw new Error('Insufficient gift card balance')
  }

  const client = getSquareClient()
  const result = await client.giftCards.activities.create({
    idempotencyKey,
    giftCardActivity: {
      type: 'REDEEM',
      locationId: SQUARE_LOCATION_ID,
      giftCardId: card.id,
      redeemActivityDetails: {
        amountMoney: { amount: BigInt(amountCents), currency: 'USD' },
        referenceId: idempotencyKey,
      },
    },
  })
  return (result as any).giftCardActivity ?? null
}

/** Link a Square gift card to a Square customer. */
export async function linkGiftCardToCustomer(giftCardId: string, customerId: string) {
  const client = getSquareClient()
  const result = await client.giftCards.linkCustomer({ giftCardId, customerId } as any)
  return (result as any).giftCard ?? null
}

/**
 * Create a digital Square gift card (PENDING), then ACTIVATE (or LOAD if already active)
 * with the given amount. Returns gan + giftCardId.
 */
export async function createOrLoadStudentGiftCard(opts: {
  amountCents: number
  idempotencyKey: string
  existingGan?: string | null
  customerId?: string | null
  buyerPaymentInstrumentIds?: string[]
}): Promise<{ gan: string; giftCardId: string; activated: boolean }> {
  if (!Number.isInteger(opts.amountCents) || opts.amountCents < 0) {
    throw new Error('Invalid gift card amount')
  }
  if (!SQUARE_LOCATION_ID) throw new Error('SQUARE_LOCATION_ID is not set')

  const client = getSquareClient()
  let gan = String(opts.existingGan ?? '').trim()
  let giftCardId = ''
  let state = ''

  if (gan) {
    const existing = await getGiftCardByGan(gan)
    giftCardId = existing?.id ?? ''
    state = String(existing?.state ?? '')
    if (!giftCardId) gan = ''
  }

  if (!gan) {
    const created = await client.giftCards.create({
      idempotencyKey: `${opts.idempotencyKey}-create`,
      locationId: SQUARE_LOCATION_ID,
      giftCard: { type: 'DIGITAL' },
    })
    const card = (created as any).giftCard
    gan = String(card?.gan ?? '')
    giftCardId = String(card?.id ?? '')
    state = String(card?.state ?? 'PENDING')
    if (!gan || !giftCardId) throw new Error('Square did not return a gift card GAN')

    if (opts.customerId) {
      try {
        await linkGiftCardToCustomer(giftCardId, opts.customerId)
      } catch {
 // Linking is best-effort. card still usable by GAN
      }
    }
  }

  if (opts.amountCents > 0) {
    const activityType = state === 'ACTIVE' ? 'LOAD' : 'ACTIVATE'
    const detailsKey =
      activityType === 'LOAD' ? 'loadActivityDetails' : 'activateActivityDetails'
    await client.giftCards.activities.create({
      idempotencyKey: `${opts.idempotencyKey}-${activityType.toLowerCase()}`,
      giftCardActivity: {
        type: activityType,
        locationId: SQUARE_LOCATION_ID,
        giftCardId,
        [detailsKey]: {
          amountMoney: { amount: BigInt(opts.amountCents), currency: 'USD' },
          // Required by Square for custom (non-Orders-API) processing; used for compliance checks.
          buyerPaymentInstrumentIds: opts.buyerPaymentInstrumentIds ?? ['gift-card-provision'],
          referenceId: opts.idempotencyKey,
        },
      },
    })
  }

  return { gan, giftCardId, activated: true }
}

/** Create or find a Square customer record (one per parent email). */
export async function upsertSquareCustomer(email: string, name: string) {
  const client = getSquareClient()
  const searchResult = await client.customers.search({
    query: { filter: { emailAddress: { exact: email } } },
  })
  const existing = (searchResult as any).customers
  if (existing?.length) return existing[0]

  const [givenName, ...rest] = name.split(' ')
  const createResult = await client.customers.create({
    idempotencyKey: `customer-${email}`,
    emailAddress: email,
    givenName,
    familyName: rest.join(' '),
  })
  return (createResult as any).customer ?? null
}

/**
 * Keep Square Customer searchable on Stand for Cove Digital Card.
 * Nickname = 6-digit PIN; reference_id = "PIN passcode" (both tokens searchable);
 * companyName = passcode; custom attrs cove_pin / cove_passcode; gift card on file.
 */
export function buildCoveStandReferenceId(pin: string, passcode?: string | null): string {
  const p = String(pin || '')
    .trim()
  const w = String(passcode || '')
    .trim()
    .toLowerCase()
  const combined = [p, w].filter(Boolean).join(' ')
  return combined.slice(0, 100)
}

export async function upsertSquareCustomerForCoveStand(opts: {
  email: string
  name?: string
  coveFamilyCode?: string | null
  coveFamilyPasscode?: string | null
  giftCardId?: string | null
  gan?: string | null
}): Promise<{ customerId: string | null; linkedGiftCard: boolean }> {
  const email = String(opts.email || '')
    .trim()
    .toLowerCase()
  if (!email || !email.includes('@')) return { customerId: null, linkedGiftCard: false }

  const pin = String(opts.coveFamilyCode || '')
    .trim()
  const passcode = String(opts.coveFamilyPasscode || '')
    .trim()
    .toLowerCase()
  const name = String(opts.name || email.split('@')[0] || 'Cove Family').trim()

  try {
    const client = getSquareClient()
    const searchResult = await client.customers.search({
      query: { filter: { emailAddress: { exact: email } } },
      limit: 5n,
    })
    let customer = ((searchResult as any).customers as Array<Record<string, any>> | undefined)?.[0]

    if (!customer) {
      const [givenName, ...rest] = name.split(/\s+/)
      const createResult = await client.customers.create({
        idempotencyKey: `cove-stand-${email}`.slice(0, 45),
        emailAddress: email,
        givenName: givenName || 'Cove',
        familyName: rest.join(' ') || 'Family',
        nickname: pin || undefined,
        referenceId: buildCoveStandReferenceId(pin, passcode) || undefined,
        companyName: passcode || undefined,
        note: pin || passcode ? `Cove Digital Card · PIN ${pin || '—'} · passcode ${passcode || '—'}` : undefined,
      })
      customer = (createResult as any).customer
    } else {
      const version = customer.version
      const updatePayload: Record<string, unknown> = {
        customerId: customer.id,
        givenName: customer.givenName,
        familyName: customer.familyName,
        emailAddress: customer.emailAddress || email,
        version,
      }
      if (pin) updatePayload.nickname = pin
      const ref = buildCoveStandReferenceId(pin, passcode)
      if (ref) updatePayload.referenceId = ref
      if (passcode) updatePayload.companyName = passcode
      if (pin || passcode) {
        updatePayload.note = `Cove Digital Card · PIN ${pin || '—'} · passcode ${passcode || '—'}`
      }
      const updated = await client.customers.update(updatePayload as any)
      customer = (updated as any).customer || customer
    }

    const customerId = String(customer?.id || '')
    if (!customerId) return { customerId: null, linkedGiftCard: false }

    // Custom attributes (Dashboard visible after Configure profiles)
    for (const [key, value] of [
      ['cove_pin', pin],
      ['cove_passcode', passcode],
    ] as const) {
      if (!value) continue
      try {
        await client.customers.customAttributes.upsert({
          customerId,
          key,
          customAttribute: { value },
        })
      } catch {
        // Definitions may be missing in some envs — nickname/reference_id still work
      }
    }

    let linkedGiftCard = false
    let giftCardId = String(opts.giftCardId || '').trim()
    if (!giftCardId && opts.gan) {
      try {
        const card = await getGiftCardByGan(String(opts.gan).trim())
        giftCardId = String(card?.id || '')
      } catch {
        giftCardId = ''
      }
    }
    if (giftCardId) {
      try {
        await linkGiftCardToCustomer(giftCardId, customerId)
        linkedGiftCard = true
      } catch {
        linkedGiftCard = false
      }
    }

    return { customerId, linkedGiftCard }
  } catch (err) {
    console.warn('upsertSquareCustomerForCoveStand failed', err)
    return { customerId: null, linkedGiftCard: false }
  }
}


/** Store a Web Payments SDK token as a reusable Square card on file. */
export async function createCardOnFile(input: {
  sourceId: string
  customerId: string
  referenceId: string
  idempotencyKey: string
}) {
  const client = getSquareClient()
  const result = await client.cards.create({
    idempotencyKey: input.idempotencyKey,
    sourceId: input.sourceId,
    card: {
      customerId: input.customerId,
      referenceId: input.referenceId,
    },
  })
  return (result as any).card ?? null
}

/** Charge a one-time token or stored Square card. Returns only completed payments. */
export async function chargePayment(input: {
  sourceId: string
  amountCents: number
  idempotencyKey: string
  customerId?: string
  referenceId?: string
  buyerEmailAddress?: string
  note?: string
}) {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 100) {
    throw new Error('Invalid payment amount')
  }

  const client = getSquareClient()
  const result = await client.payments.create({
    sourceId: input.sourceId,
    idempotencyKey: input.idempotencyKey,
    amountMoney: { amount: BigInt(input.amountCents), currency: 'USD' },
    autocomplete: true,
    locationId: SQUARE_LOCATION_ID,
    customerId: input.customerId,
    referenceId: input.referenceId,
    buyerEmailAddress: input.buyerEmailAddress,
    note: input.note,
  })
  const payment = (result as any).payment ?? null
  if (!payment || payment.status !== 'COMPLETED') {
    throw new Error(`Square payment was not completed (${payment?.status ?? 'unknown'})`)
  }
  return payment
}


/** Disable a Square card-on-file so it cannot be charged again. */
export async function disableCardOnFile(cardId: string) {
  const client = getSquareClient()
  const result = await client.cards.disable({ cardId })
  return (result as any).card ?? null
}

export function getSquareWebPaymentsConfig() {
  return {
    applicationId: process.env.SQUARE_APPLICATION_ID ?? '',
    locationId: SQUARE_LOCATION_ID,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
  }
}
