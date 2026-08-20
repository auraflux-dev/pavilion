/**
 * Household Square card + PayPal vault rows in Wix StoredPaymentMethods.
 * Always key by primary household email (not staff login).
 */
import { getWixClient } from '@/lib/wix-client'

export type StoredPaymentMethodRow = {
  _id?: string
  parentEmail?: string
  wixMemberId?: string
  squareCustomerId?: string
  squareCardId?: string
  brand?: string
  last4?: string
  expMonth?: number | null
  expYear?: number | null
  paypalVaultId?: string
  paypalCustomerId?: string
  paypalPayerEmail?: string
  active?: boolean
  updatedAt?: string
}

export async function findStoredPaymentMethod(
  householdEmail: string,
): Promise<StoredPaymentMethodRow | null> {
  const email = householdEmail.trim().toLowerCase()
  if (!email) return null
  const client = getWixClient()
  const result = await client.items
    .query('StoredPaymentMethods')
    .eq('parentEmail', email)
    .eq('active', true)
    .find()
  return (result.items?.[0] as StoredPaymentMethodRow | undefined) ?? null
}

export async function upsertStoredPaymentMethod(
  householdEmail: string,
  patch: Partial<StoredPaymentMethodRow>,
): Promise<StoredPaymentMethodRow> {
  const email = householdEmail.trim().toLowerCase()
  const client = getWixClient()
  const existing = await findStoredPaymentMethod(email)
  const row: StoredPaymentMethodRow = {
    ...(existing ?? {}),
    ...patch,
    _id: existing?._id,
    parentEmail: email,
    active: true,
    updatedAt: new Date().toISOString(),
  }
  if (existing?._id) {
    await client.items.update('StoredPaymentMethods', row as never)
  } else {
    delete row._id
    await client.items.insert('StoredPaymentMethods', row)
  }
  return row
}

export function hasSquareCard(row: StoredPaymentMethodRow | null | undefined): boolean {
  return Boolean(row?.squareCardId && row?.squareCustomerId)
}

export function hasPayPalVault(row: StoredPaymentMethodRow | null | undefined): boolean {
  return Boolean(row?.paypalVaultId)
}
