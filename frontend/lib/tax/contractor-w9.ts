/**
 * Contractor W-9 tracking + lightweight 990-EZ helper export (Pavilion CMS).
 */
import 'server-only'

import { randomUUID } from 'crypto'
import { sqlForOrg } from '@/lib/crm/tenant'
import { pavilionCmsEnabled, resolveCmsOrganizationId } from '@/lib/cms/store'

export type ContractorW9 = {
  id: string
  email: string
  legalName: string
  tinLast4: string
  addressLine: string
  w9OnFile: boolean
  ytdPaidCents: number
  updatedAt: string
}

export async function resolveTaxOrgId(req?: Request): Promise<string | null> {
  return resolveCmsOrganizationId(req)
}

export async function listContractorW9(orgId: string): Promise<ContractorW9[]> {
  if (!pavilionCmsEnabled()) return []
  const res = await sqlForOrg<{
    id: string
    email: string
    legal_name: string
    tin_last4: string
    address_line: string
    w9_on_file: boolean
    ytd_paid_cents: number
    updated_at: Date
  }>(
    orgId,
    `select id, email, legal_name, tin_last4, address_line, w9_on_file, ytd_paid_cents, updated_at
       from cms_contractor_w9
      where organization_id = $1
      order by legal_name asc, email asc`,
    [orgId],
  )
  return res.rows.map((r) => ({
    id: r.id,
    email: r.email,
    legalName: r.legal_name,
    tinLast4: r.tin_last4,
    addressLine: r.address_line,
    w9OnFile: r.w9_on_file,
    ytdPaidCents: r.ytd_paid_cents,
    updatedAt: new Date(r.updated_at).toISOString(),
  }))
}

export async function upsertContractorW9(input: {
  orgId: string
  email: string
  legalName?: string
  tinLast4?: string
  addressLine?: string
  w9OnFile?: boolean
  ytdPaidCents?: number
}): Promise<ContractorW9> {
  const email = input.email.trim().toLowerCase()
  if (!email) throw new Error('email required')
  const id = randomUUID()
  const legalName = (input.legalName || '').trim()
  const tinLast4 = (input.tinLast4 || '').replace(/\D/g, '').slice(-4)
  const addressLine = (input.addressLine || '').trim()
  const w9OnFile = input.w9OnFile === true
  const ytdPaidCents = Math.max(0, Math.round(Number(input.ytdPaidCents) || 0))

  await sqlForOrg(
    input.orgId,
    `insert into cms_contractor_w9
      (id, organization_id, email, legal_name, tin_last4, address_line, w9_on_file, ytd_paid_cents)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (organization_id, email) do update set
       legal_name = excluded.legal_name,
       tin_last4 = excluded.tin_last4,
       address_line = excluded.address_line,
       w9_on_file = excluded.w9_on_file,
       ytd_paid_cents = excluded.ytd_paid_cents,
       updated_at = now()`,
    [id, input.orgId, email, legalName, tinLast4, addressLine, w9OnFile, ytdPaidCents],
  )

  const rows = await listContractorW9(input.orgId)
  const found = rows.find((r) => r.email === email)
  if (!found) throw new Error('Could not save W-9 row')
  return found
}

/** Contractors at or above $600 YTD who may need a 1099. */
export function contractorsNeeding1099(rows: ContractorW9[]): ContractorW9[] {
  return rows.filter((r) => r.ytdPaidCents >= 60_000)
}

/**
 * Very light 990-EZ worksheet CSV (Part I style buckets).
 * Not a filing product. Helps treasurers assemble numbers for their CPA.
 */
export function build990EzWorksheetCsv(input: {
  orgName: string
  fiscalYearLabel: string
  contributionsCents: number
  programServiceCents: number
  membershipDuesCents: number
  otherRevenueCents: number
  grantsCents: number
  salariesCents: number
  otherExpensesCents: number
}): string {
  const d = (cents: number) => (cents / 100).toFixed(2)
  const totalRevenue =
    input.contributionsCents +
    input.programServiceCents +
    input.membershipDuesCents +
    input.otherRevenueCents
  const totalExpenses = input.grantsCents + input.salariesCents + input.otherExpensesCents
  const lines = [
    ['field', 'label', 'amount_usd'],
    ['org', input.orgName, ''],
    ['fiscal_year', input.fiscalYearLabel, ''],
    ['1', 'Contributions, gifts, grants', d(input.contributionsCents)],
    ['2', 'Program service revenue', d(input.programServiceCents)],
    ['3', 'Membership dues', d(input.membershipDuesCents)],
    ['4', 'Other revenue', d(input.otherRevenueCents)],
    ['9', 'Total revenue (sum 1–4)', d(totalRevenue)],
    ['10', 'Grants and similar amounts', d(input.grantsCents)],
    ['12', 'Salaries and contractor pay', d(input.salariesCents)],
    ['16', 'Other expenses', d(input.otherExpensesCents)],
    ['17', 'Total expenses', d(totalExpenses)],
    ['18', 'Excess or deficit', d(totalRevenue - totalExpenses)],
    ['note', 'Worksheet only. Not an IRS form. Review with your CPA before filing.', ''],
  ]
  return lines.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}
