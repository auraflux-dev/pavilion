/**
 * Org billing / display currency.
 *
 * Business Rocket legacy clients are CAD; one known exception is USD.
 * Pavilion school orgs stay USD unless overridden.
 */
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import type { CompanyProduct } from '@/lib/crm/platform-owners'

export type OrgCurrency = 'CAD' | 'USD'

export function defaultCurrencyForProduct(product: CompanyProduct | string | null | undefined): OrgCurrency {
  return product === 'businessrocket' ? 'CAD' : 'USD'
}

export function normalizeOrgCurrency(raw: string | null | undefined, fallback: OrgCurrency = 'USD'): OrgCurrency {
  const c = String(raw || '')
    .trim()
    .toUpperCase()
  if (c === 'CAD' || c === 'USD') return c
  return fallback
}

export function formatOrgMoney(cents: number, currency: OrgCurrency | string): string {
  const code = normalizeOrgCurrency(currency, 'USD')
  return (Number(cents) / 100).toLocaleString(code === 'CAD' ? 'en-CA' : 'en-US', {
    style: 'currency',
    currency: code,
  })
}

/** Ensure column exists (idempotent). */
export async function ensureOrgCurrencyColumn(): Promise<void> {
  if (!commonsDbEnabled()) return
  await sql(`alter table organizations add column if not exists currency text not null default 'USD'`)
}

/**
 * One-shot: set all BR customer orgs to CAD, then mark known USD exceptions by slug.
 * Call from Brand Staff / ops — do not run on every request.
 */
export async function backfillBusinessRocketCurrencyCad(usdExceptionSlugs: string[] = []): Promise<{
  cad: number
  usd: number
}> {
  await ensureOrgCurrencyColumn()
  const cad = await sql(`update organizations set currency = 'CAD' where product = 'businessrocket'`)
  let usd = 0
  for (const slug of usdExceptionSlugs) {
    const s = slug.trim().toLowerCase()
    if (!s) continue
    const r = await sql(
      `update organizations set currency = 'USD' where product = 'businessrocket' and lower(slug) = $1`,
      [s],
    )
    usd += r.rowCount || 0
  }
  return { cad: cad.rowCount || 0, usd }
}

export async function getOrgCurrency(orgId: string): Promise<OrgCurrency> {
  if (!commonsDbEnabled() || !orgId.trim()) return 'USD'
  await ensureOrgCurrencyColumn()
  const res = await sql<{ currency: string | null; product: string | null }>(
    `select currency, product from organizations where id = $1 limit 1`,
    [orgId.trim()],
  )
  const row = res.rows[0]
  if (!row) return 'USD'
  const productDefault = defaultCurrencyForProduct(row.product)
  if (row.currency && String(row.currency).trim()) {
    return normalizeOrgCurrency(row.currency, productDefault)
  }
  return productDefault
}

export async function setOrgCurrency(orgId: string, currency: OrgCurrency): Promise<OrgCurrency> {
  await ensureOrgCurrencyColumn()
  const code = normalizeOrgCurrency(currency, 'USD')
  await sql(`update organizations set currency = $1 where id = $2`, [code, orgId.trim()])
  return code
}
