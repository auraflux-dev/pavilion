/**
 * Expense reimbursement requests — staff submit, President/Admin approve,
 * Treasurer marks paid. Backed by the ExpenseReimbursements CMS collection.
 */
import { getWixClient } from '@/lib/wix-client'

export type ExpenseLineItem = {
  date: string
  vendor: string
  description: string
  amount: number
}

export type ExpenseStatus = 'Submitted' | 'Approved' | 'Paid' | 'Rejected'

export type ExpenseReimbursement = {
  id: string
  requestorName: string
  requestorEmail: string
  requestorPhone: string
  committeeEvent: string
  dateOfRequest: string
  lineItems: ExpenseLineItem[]
  totalAmount: number
  paymentMethod: string
  paymentHandle: string
  receiptUrls: string[]
  status: ExpenseStatus
  submittedByEmail: string
  chairApproverEmail: string
  chairApprovedDate: string
  treasurerPaidDate: string
  notes: string
  createdDate: string
}

const COLLECTION = 'ExpenseReimbursements'

function parseJsonArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (typeof raw !== 'string' || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function normalizeLineItems(raw: unknown): ExpenseLineItem[] {
  return parseJsonArray<Partial<ExpenseLineItem>>(raw)
    .map((li) => ({
      date: String(li?.date ?? '').trim(),
      vendor: String(li?.vendor ?? '').trim(),
      description: String(li?.description ?? '').trim(),
      amount: Math.round((Number(li?.amount) || 0) * 100) / 100,
    }))
    .filter((li) => li.vendor || li.description || li.amount > 0)
}

function computeTotal(items: ExpenseLineItem[]): number {
  return Math.round(items.reduce((sum, li) => sum + (Number(li.amount) || 0), 0) * 100) / 100
}

function mapRow(row: Record<string, unknown>): ExpenseReimbursement {
  const lineItems = normalizeLineItems(row.lineItems)
  return {
    id: String(row._id ?? ''),
    requestorName: String(row.requestorName ?? ''),
    requestorEmail: String(row.requestorEmail ?? ''),
    requestorPhone: String(row.requestorPhone ?? ''),
    committeeEvent: String(row.committeeEvent ?? ''),
    dateOfRequest: String(row.dateOfRequest ?? ''),
    lineItems,
    totalAmount:
      Number(row.totalAmount) > 0 ? Number(row.totalAmount) : computeTotal(lineItems),
    paymentMethod: String(row.paymentMethod ?? ''),
    paymentHandle: String(row.paymentHandle ?? ''),
    receiptUrls: parseJsonArray<string>(row.receiptUrls).map((u) => String(u)),
    status: (String(row.status ?? 'Submitted') as ExpenseStatus) || 'Submitted',
    submittedByEmail: String(row.submittedByEmail ?? ''),
    chairApproverEmail: String(row.chairApproverEmail ?? ''),
    chairApprovedDate: String(row.chairApprovedDate ?? ''),
    treasurerPaidDate: String(row.treasurerPaidDate ?? ''),
    notes: String(row.notes ?? ''),
    createdDate: String(row._createdDate ?? ''),
  }
}

export async function listExpenseReimbursements(opts?: {
  submittedByEmail?: string
}): Promise<ExpenseReimbursement[]> {
  const client = getWixClient()
  let q = client.items.query(COLLECTION).descending('_createdDate').limit(200)
  if (opts?.submittedByEmail) {
    q = q.eq('submittedByEmail', opts.submittedByEmail.trim().toLowerCase())
  }
  const res = await q.find()
  return (res.items ?? []).map((r) => mapRow(r as Record<string, unknown>))
}

export async function createExpenseReimbursement(input: {
  requestorName: string
  requestorEmail: string
  requestorPhone?: string
  committeeEvent: string
  dateOfRequest?: string
  lineItems: ExpenseLineItem[]
  paymentMethod: string
  paymentHandle: string
  receiptUrls?: string[]
  notes?: string
  submittedByEmail: string
}): Promise<ExpenseReimbursement> {
  const lineItems = normalizeLineItems(input.lineItems)
  if (!input.requestorName.trim()) throw new Error('Requestor name is required')
  if (!input.requestorEmail.trim()) throw new Error('Requestor email is required')
  if (!lineItems.length) throw new Error('Add at least one expense line item')
  const total = computeTotal(lineItems)
  if (total <= 0) throw new Error('Total must be greater than $0')

  const method = ['Zelle', 'PayPal'].includes(input.paymentMethod)
    ? input.paymentMethod
    : 'Zelle'
  if (!input.paymentHandle.trim()) {
    throw new Error('Payment handle (Zelle / PayPal username) is required')
  }

  const client = getWixClient()
  const row = {
    requestorName: input.requestorName.trim(),
    requestorEmail: input.requestorEmail.trim(),
    requestorPhone: String(input.requestorPhone ?? '').trim(),
    committeeEvent: input.committeeEvent.trim(),
    dateOfRequest: input.dateOfRequest?.trim() || new Date().toISOString().slice(0, 10),
    lineItems: JSON.stringify(lineItems),
    totalAmount: total,
    paymentMethod: method,
    paymentHandle: input.paymentHandle.trim(),
    receiptUrls: JSON.stringify((input.receiptUrls ?? []).filter(Boolean)),
    status: 'Submitted' as ExpenseStatus,
    submittedByEmail: input.submittedByEmail.trim().toLowerCase(),
    chairApproverEmail: '',
    chairApprovedDate: '',
    treasurerPaidDate: '',
    notes: String(input.notes ?? '').trim(),
  }
  const inserted = await client.items.insert(COLLECTION, row)
  return mapRow(inserted as Record<string, unknown>)
}

/** Approve / reject (chair/president) or mark paid (treasurer). */
export async function setExpenseStatus(input: {
  id: string
  action: 'approve' | 'reject' | 'markPaid' | 'reopen'
  actorEmail: string
  notes?: string
}): Promise<ExpenseReimbursement> {
  const client = getWixClient()
  const found = await client.items.query(COLLECTION).eq('_id', input.id).limit(1).find()
  const existing = found.items?.[0] as Record<string, unknown> | undefined
  if (!existing) throw new Error('Reimbursement not found')

  const now = new Date().toISOString()
  const actor = input.actorEmail.trim().toLowerCase()
  const patch: Record<string, unknown> = { ...existing }

  if (input.action === 'approve') {
    patch.status = 'Approved'
    patch.chairApproverEmail = actor
    patch.chairApprovedDate = now
  } else if (input.action === 'reject') {
    patch.status = 'Rejected'
    patch.chairApproverEmail = actor
    patch.chairApprovedDate = now
  } else if (input.action === 'markPaid') {
    patch.status = 'Paid'
    patch.treasurerPaidDate = now
  } else if (input.action === 'reopen') {
    patch.status = 'Submitted'
    patch.chairApproverEmail = ''
    patch.chairApprovedDate = ''
    patch.treasurerPaidDate = ''
  }
  if (input.notes != null) patch.notes = String(input.notes).trim()

  const updated = await client.items.update(COLLECTION, patch as never)
  return mapRow(updated as Record<string, unknown>)
}
