/**
 * Square Terminal API helpers for in-person card-present checkout.
 * Requires a Square Terminal paired via Devices API (not Square Stand / POS app).
 */
import { randomUUID } from 'crypto'
import { SquareClient, SquareEnvironment } from 'square'
import { SQUARE_LOCATION_ID } from '@/lib/square'

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

export type TerminalDeviceCode = {
  id: string
  code: string
  status: string
  deviceId: string | null
  name: string
  pairBy: string | null
}

export type TerminalCheckoutStatus = {
  id: string
  status: string
  amountCents: number
  paymentIds: string[]
  deviceId: string
  createdAt?: string
  updatedAt?: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

/** Create a one-time code the seller enters on the Square Terminal to pair. */
export async function createTerminalDeviceCode(name = 'SHMS In-person sales'): Promise<TerminalDeviceCode> {
  if (!SQUARE_LOCATION_ID) throw new Error('SQUARE_LOCATION_ID is not set')
  const client = getSquareClient()
  const result = await client.devices.codes.create({
    idempotencyKey: randomUUID(),
    deviceCode: {
      productType: 'TERMINAL_API',
      locationId: SQUARE_LOCATION_ID,
      name,
    },
  })
  const row = asRecord((result as { deviceCode?: unknown }).deviceCode ?? result)
  return {
    id: String(row.id ?? ''),
    code: String(row.code ?? ''),
    status: String(row.status ?? 'UNPAIRED'),
    deviceId: row.deviceId ? String(row.deviceId) : null,
    name: String(row.name ?? name),
    pairBy: row.pairBy ? String(row.pairBy) : null,
  }
}

export async function getTerminalDeviceCode(deviceCodeId: string): Promise<TerminalDeviceCode | null> {
  const client = getSquareClient()
  const result = await client.devices.codes.get({ id: deviceCodeId })
  const row = asRecord((result as { deviceCode?: unknown }).deviceCode ?? result)
  if (!row.id) return null
  return {
    id: String(row.id),
    code: String(row.code ?? ''),
    status: String(row.status ?? ''),
    deviceId: row.deviceId ? String(row.deviceId) : null,
    name: String(row.name ?? ''),
    pairBy: row.pairBy ? String(row.pairBy) : null,
  }
}

/**
 * Device ID used for Terminal checkouts.
 * Prefer SiteSettings / explicit env override over a stale unpaired code.
 */
export function terminalDeviceIdFromEnv(): string {
  return String(process.env.SQUARE_TERMINAL_DEVICE_ID ?? '').trim()
}

export async function createTerminalCheckout(input: {
  amountCents: number
  deviceId: string
  referenceId?: string
  note?: string
  idempotencyKey?: string
}): Promise<TerminalCheckoutStatus> {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 1) {
    throw new Error('Invalid Terminal checkout amount')
  }
  if (!input.deviceId) throw new Error('Terminal device is not paired')
  if (!SQUARE_LOCATION_ID) throw new Error('SQUARE_LOCATION_ID is not set')

  const client = getSquareClient()
  const result = await client.terminal.checkouts.create({
    idempotencyKey: input.idempotencyKey ?? randomUUID(),
    checkout: {
      amountMoney: {
        amount: BigInt(input.amountCents),
        currency: 'USD',
      },
      deviceOptions: {
        deviceId: input.deviceId,
        skipReceiptScreen: false,
        tipSettings: { allowTipping: false },
      },
      referenceId: input.referenceId?.slice(0, 40),
      note: input.note?.slice(0, 500),
      paymentType: 'CARD_PRESENT',
    },
  })

  return mapCheckout((result as { checkout?: unknown }).checkout ?? result)
}

export async function getTerminalCheckout(checkoutId: string): Promise<TerminalCheckoutStatus | null> {
  const client = getSquareClient()
  const result = await client.terminal.checkouts.get({ checkoutId })
  const checkout = (result as { checkout?: unknown }).checkout ?? result
  if (!checkout) return null
  return mapCheckout(checkout)
}

export async function cancelTerminalCheckout(checkoutId: string): Promise<TerminalCheckoutStatus | null> {
  const client = getSquareClient()
  const result = await client.terminal.checkouts.cancel({ checkoutId })
  const checkout = (result as { checkout?: unknown }).checkout ?? result
  if (!checkout) return null
  return mapCheckout(checkout)
}

function mapCheckout(raw: unknown): TerminalCheckoutStatus {
  const row = asRecord(raw)
  const amount = asRecord(row.amountMoney)
  const deviceOptions = asRecord(row.deviceOptions)
  const paymentIds = Array.isArray(row.paymentIds)
    ? row.paymentIds.map((id) => String(id))
    : []
  return {
    id: String(row.id ?? ''),
    status: String(row.status ?? ''),
    amountCents: Number(amount.amount ?? 0),
    paymentIds,
    deviceId: String(deviceOptions.deviceId ?? ''),
    createdAt: row.createdAt ? String(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? String(row.updatedAt) : undefined,
  }
}
