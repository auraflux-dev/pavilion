/**
 * Pull BoA transactions via Plaid into PtoBudgetEntries.
 * When Plaid is connected this is the cash actuals source. not Staff Payments.
 */
import { AccountType } from 'plaid'
import { classifyBankTransaction } from '@/lib/staff/plaid-classify'
import { getPlaidClient, plaidAxiosError } from '@/lib/staff/plaid'
import {
  listActivePlaidItems,
  upsertPlaidItem,
  type StaffPlaidItem,
} from '@/lib/staff/plaid-items'
import { DEFAULT_FISCAL_YEAR, fiscalYearWindow } from '@/lib/staff/budget'
import { ensureBankBudgetLines } from '@/lib/staff/budget-bank'
import {
  listBudgetEntries,
  persistLineActuals,
  removeBudgetEntryByRefId,
  upsertBudgetEntryByRefId,
} from '@/lib/staff/budget-sync'

function inWindow(iso: string, fromMs: number, toMs: number) {
  if (!iso) return false
  const t = new Date(`${iso}T12:00:00.000Z`).getTime()
  return Number.isFinite(t) && t >= fromMs && t <= toMs
}

async function syncOneItem(
  item: StaffPlaidItem,
  opts: { fiscalYear: string; actorEmail: string; fromMs: number; toMs: number },
): Promise<{ added: number; updated: number; removed: number }> {
  const client = getPlaidClient()
  const depositoryIds = new Set<string>()
  let lastBalance = item.lastBalance
  let accountMask = item.accountMask
  let accountName = item.accountName
  try {
    const accounts = await client.accountsGet({ access_token: item.accessToken })
    for (const a of accounts.data.accounts) {
      if (a.type === AccountType.Depository) depositoryIds.add(a.account_id)
    }
    const checking =
      accounts.data.accounts.find((a) => a.type === AccountType.Depository && /check/i.test(String(a.subtype ?? ''))) ||
      accounts.data.accounts.find((a) => a.type === AccountType.Depository) ||
      accounts.data.accounts[0]
    if (checking) {
      lastBalance = Number(checking.balances.current ?? checking.balances.available ?? 0) || 0
      accountMask = checking.mask || accountMask
      accountName = checking.name || checking.official_name || accountName
    }
  } catch {
    // Continue; we'll still try to sync transactions.
  }

  let cursor = item.cursor || undefined
  let added = 0
  let updated = 0
  let removed = 0
  let nextCursor = item.cursor
  let hasMore = true

  while (hasMore) {
    const res = await client.transactionsSync({
      access_token: item.accessToken,
      cursor: cursor || undefined,
      count: 500,
      options: { include_original_description: true },
    })
    const data = res.data

    for (const tx of data.added) {
      if (tx.pending) continue
      if (depositoryIds.size && tx.account_id && !depositoryIds.has(tx.account_id)) continue
      const date = String(tx.date ?? tx.authorized_date ?? '')
      if (!inWindow(date, opts.fromMs, opts.toMs)) continue
      const classified = classifyBankTransaction({
        name: tx.name || tx.original_description || '',
        merchantName: tx.merchant_name || undefined,
        amount: Number(tx.amount) || 0,
        pending: tx.pending,
        pfcPrimary: tx.personal_finance_category?.primary,
        pfcDetailed: tx.personal_finance_category?.detailed,
      })
      if (!classified) continue
      const result = await upsertBudgetEntryByRefId({
        fiscalYear: opts.fiscalYear,
        lineSyncKey: classified.syncKey,
        occurredAt: date.slice(0, 10),
        amount: classified.amount,
        memo: [tx.merchant_name || tx.name, tx.account_id ? '' : ''].filter(Boolean).join(' ') || classified.syncKey,
        origin: 'auto-plaid',
        refId: `plaid:${tx.transaction_id}`,
        createdByEmail: opts.actorEmail,
      })
      if (result === 'inserted') added += 1
      if (result === 'updated') updated += 1
    }

    for (const tx of data.modified) {
      if (tx.pending) {
        if (await removeBudgetEntryByRefId(`plaid:${tx.transaction_id}`)) removed += 1
        continue
      }
      const date = String(tx.date ?? tx.authorized_date ?? '')
      if (!inWindow(date, opts.fromMs, opts.toMs)) {
        if (await removeBudgetEntryByRefId(`plaid:${tx.transaction_id}`)) removed += 1
        continue
      }
      const classified = classifyBankTransaction({
        name: tx.name || tx.original_description || '',
        merchantName: tx.merchant_name || undefined,
        amount: Number(tx.amount) || 0,
        pending: tx.pending,
        pfcPrimary: tx.personal_finance_category?.primary,
        pfcDetailed: tx.personal_finance_category?.detailed,
      })
      if (!classified) {
        if (await removeBudgetEntryByRefId(`plaid:${tx.transaction_id}`)) removed += 1
        continue
      }
      const result = await upsertBudgetEntryByRefId({
        fiscalYear: opts.fiscalYear,
        lineSyncKey: classified.syncKey,
        occurredAt: date.slice(0, 10),
        amount: classified.amount,
        memo: tx.merchant_name || tx.name || classified.syncKey,
        origin: 'auto-plaid',
        refId: `plaid:${tx.transaction_id}`,
        createdByEmail: opts.actorEmail,
      })
      if (result === 'inserted') added += 1
      if (result === 'updated') updated += 1
    }

    for (const tx of data.removed) {
      if (tx.transaction_id && (await removeBudgetEntryByRefId(`plaid:${tx.transaction_id}`))) {
        removed += 1
      }
    }

    nextCursor = data.next_cursor
    cursor = data.next_cursor
    hasMore = data.has_more
  }

  await upsertPlaidItem({
    itemId: item.itemId,
    accessToken: item.accessToken,
    cursor: nextCursor,
    connectedByEmail: item.connectedByEmail,
    lastSyncedAt: new Date().toISOString(),
    lastBalance,
    accountMask,
    accountName,
    error: '',
    active: true,
  })

  return { added, updated, removed }
}

export async function refreshPlaidIntoBudget(opts: {
  fiscalYear?: string
  actorEmail: string
}): Promise<{ added: number; updated: number; removed: number; needsReauth: boolean; message?: string }> {
  const fiscalYear = opts.fiscalYear || DEFAULT_FISCAL_YEAR
  const { from, to } = fiscalYearWindow(fiscalYear)
  const items = await listActivePlaidItems()
  if (!items.length) {
    throw new Error('Connect Bank of America with Plaid first')
  }
  await ensureBankBudgetLines(fiscalYear)

  let added = 0
  let updated = 0
  let removed = 0
  let needsReauth = false
  let message: string | undefined

  for (const item of items) {
    try {
      const result = await syncOneItem(item, {
        fiscalYear,
        actorEmail: opts.actorEmail,
        fromMs: from.getTime(),
        toMs: to.getTime(),
      })
      added += result.added
      updated += result.updated
      removed += result.removed
    } catch (err) {
      const plaid = plaidAxiosError(err)
      const code = plaid?.code || ''
      if (code === 'ITEM_LOGIN_REQUIRED') {
        needsReauth = true
        await upsertPlaidItem({
          itemId: item.itemId,
          accessToken: item.accessToken,
          connectedByEmail: item.connectedByEmail,
          error: 'ITEM_LOGIN_REQUIRED',
          active: true,
        })
        continue
      }
      if (code === 'PRODUCT_NOT_READY') {
        message = 'Plaid is still preparing transactions. Wait a minute and Refresh again.'
        continue
      }
      throw new Error(plaid?.message || (err instanceof Error ? err.message : 'Plaid sync failed'))
    }
  }

  const entries = await listBudgetEntries(fiscalYear)
  await persistLineActuals(fiscalYear, entries)
  return { added, updated, removed, needsReauth, message }
}
