/**
 * Org-wide Plaid Item (typically Bank of America checking). Treasurer/admin connect once.
 */
import { getWixClient } from '@/lib/wix-client'

export const PLAID_ITEMS_COLLECTION = 'StaffPlaidItems'

export type StaffPlaidItem = {
  id: string
  itemId: string
  accessToken: string
  institutionId: string
  institutionName: string
  cursor: string
  connectedByEmail: string
  accountMask: string
  accountName: string
  lastSyncedAt: string
  lastBalance: number
  error: string
  active: boolean
}

const FIELDS = [
  { key: 'itemId', displayName: 'Plaid item ID', type: 'TEXT' },
  { key: 'accessToken', displayName: 'Access token', type: 'TEXT' },
  { key: 'institutionId', displayName: 'Institution ID', type: 'TEXT' },
  { key: 'institutionName', displayName: 'Institution', type: 'TEXT' },
  { key: 'cursor', displayName: 'Transactions cursor', type: 'TEXT' },
  { key: 'connectedByEmail', displayName: 'Connected by', type: 'TEXT' },
  { key: 'accountMask', displayName: 'Account mask', type: 'TEXT' },
  { key: 'accountName', displayName: 'Account name', type: 'TEXT' },
  { key: 'lastSyncedAt', displayName: 'Last synced', type: 'TEXT' },
  { key: 'lastBalance', displayName: 'Last balance $', type: 'NUMBER' },
  { key: 'error', displayName: 'Item error', type: 'TEXT' },
  { key: 'active', displayName: 'Active', type: 'BOOLEAN' },
  { key: 'updatedAt', displayName: 'Updated at', type: 'TEXT' },
] as const

function wixHeaders() {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) throw new Error('WIX_API_KEY / WIX_SITE_ID not configured')
  return {
    Authorization: apiKey,
    'wix-site-id': siteId,
    'Content-Type': 'application/json',
  }
}

export async function ensurePlaidItemsCollection(): Promise<void> {
  const headers = wixHeaders()
  const getRes = await fetch(`https://www.wixapis.com/wix-data/v2/collections/${PLAID_ITEMS_COLLECTION}`, {
    method: 'GET',
    headers,
  })
  if (getRes.ok) return
  const createRes = await fetch('https://www.wixapis.com/wix-data/v2/collections', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      collection: {
        id: PLAID_ITEMS_COLLECTION,
        displayName: 'Staff Plaid Items',
        fields: FIELDS.map((f) => ({ key: f.key, displayName: f.displayName, type: f.type })),
        permissions: {
          insert: 'ADMIN',
          update: 'ADMIN',
          remove: 'ADMIN',
          read: 'ADMIN',
        },
      },
    }),
  })
  if (!createRes.ok) {
    const body = await createRes.text()
    throw new Error(`Could not create ${PLAID_ITEMS_COLLECTION}: ${body.slice(0, 240)}`)
  }
}

function mapItem(row: Record<string, unknown>): StaffPlaidItem {
  return {
    id: String(row._id ?? ''),
    itemId: String(row.itemId ?? ''),
    accessToken: String(row.accessToken ?? ''),
    institutionId: String(row.institutionId ?? ''),
    institutionName: String(row.institutionName ?? ''),
    cursor: String(row.cursor ?? ''),
    connectedByEmail: String(row.connectedByEmail ?? ''),
    accountMask: String(row.accountMask ?? ''),
    accountName: String(row.accountName ?? ''),
    lastSyncedAt: String(row.lastSyncedAt ?? ''),
    lastBalance: Number(row.lastBalance ?? 0) || 0,
    error: String(row.error ?? ''),
    active: row.active !== false,
  }
}

export async function listActivePlaidItems(): Promise<StaffPlaidItem[]> {
  await ensurePlaidItemsCollection()
  const client = getWixClient()
  const res = await client.items.query(PLAID_ITEMS_COLLECTION).limit(50).find().catch(() => ({ items: [] }))
  return ((res.items ?? []) as Record<string, unknown>[]).map(mapItem).filter((item) => item.active && item.accessToken)
}

export async function hasActivePlaidItem() {
  return (await listActivePlaidItems()).length > 0
}

export function publicPlaidStatus(items: StaffPlaidItem[]) {
  const item = items[0]
  if (!item) {
    return { connected: false as const }
  }
  return {
    connected: true as const,
    institutionName: item.institutionName || 'Bank',
    accountLabel: [item.accountName, item.accountMask ? `••••${item.accountMask}` : '']
      .filter(Boolean)
      .join(' '),
    lastSyncedAt: item.lastSyncedAt,
    lastBalance: item.lastBalance,
    needsReauth: Boolean(item.error),
    error: item.error,
    connectedByEmail: item.connectedByEmail,
  }
}

export async function upsertPlaidItem(input: {
  itemId: string
  accessToken: string
  institutionId?: string
  institutionName?: string
  cursor?: string
  connectedByEmail: string
  accountMask?: string
  accountName?: string
  lastSyncedAt?: string
  lastBalance?: number
  error?: string
  active?: boolean
}) {
  await ensurePlaidItemsCollection()
  const client = getWixClient()
  const existing = await client.items
    .query(PLAID_ITEMS_COLLECTION)
    .eq('itemId', input.itemId)
    .limit(1)
    .find()
    .catch(() => ({ items: [] }))
  const found = existing.items?.[0] as Record<string, unknown> | undefined
  const payload = {
    itemId: input.itemId,
    accessToken: input.accessToken || String(found?.accessToken ?? ''),
    institutionId: input.institutionId ?? String(found?.institutionId ?? ''),
    institutionName: input.institutionName ?? String(found?.institutionName ?? ''),
    cursor: input.cursor ?? String(found?.cursor ?? ''),
    connectedByEmail: input.connectedByEmail || String(found?.connectedByEmail ?? ''),
    accountMask: input.accountMask ?? String(found?.accountMask ?? ''),
    accountName: input.accountName ?? String(found?.accountName ?? ''),
    lastSyncedAt: input.lastSyncedAt ?? String(found?.lastSyncedAt ?? ''),
    lastBalance:
      input.lastBalance != null ? input.lastBalance : Number(found?.lastBalance ?? 0) || 0,
    error: input.error ?? '',
    active: input.active !== false,
    updatedAt: new Date().toISOString(),
  }
  if (found?._id) {
    await client.items.update(PLAID_ITEMS_COLLECTION, { ...found, ...payload, _id: String(found._id) })
    return String(found._id)
  }
  const inserted = await client.items.insert(PLAID_ITEMS_COLLECTION, payload)
  return String((inserted as { _id?: string })._id ?? '')
}

export async function deactivatePlaidItem(itemId: string) {
  const client = getWixClient()
  const existing = await client.items
    .query(PLAID_ITEMS_COLLECTION)
    .eq('itemId', itemId)
    .limit(1)
    .find()
    .catch(() => ({ items: [] }))
  const found = existing.items?.[0] as Record<string, unknown> | undefined
  if (!found?._id) return
  await client.items.update(PLAID_ITEMS_COLLECTION, {
    ...found,
    _id: String(found._id),
    active: false,
    accessToken: '',
    cursor: '',
    error: '',
    updatedAt: new Date().toISOString(),
  })
}
