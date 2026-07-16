/**
 * Square SDK client + Gift Card helpers.
 * All calls are server-side only — never import this in client components.
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
  const result = await client.giftCards.get({ giftCardId: id } as any)
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
  const activities: any[] = (result as any).giftCardActivities ?? []
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
  idempotencyKey: string
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
