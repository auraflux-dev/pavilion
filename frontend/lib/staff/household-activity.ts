/**
 * Account-first household activity for Staff.
 * Always open by A##### (or resolve email → A#####), then list seats + payments under it.
 */
import { getWixClient } from '@/lib/wix-client'
import { ACTIVE_ENROLL_STATUSES, WAITLIST_STATUS } from '@/lib/programs/enrollments'
import {
  ensureAccountNumberForEmail,
  normalizeAccountNumber,
  resolveHousehold,
  resolveHouseholdByAccountNumber,
  type Household,
} from '@/lib/staff/membership-account-number'

export type HouseholdPaymentRow = {
  id: string
  accountNumber: string | null
  programName: string
  amount: number
  status: string
  paymentDate: string
  paymentMethod: string
  transactionId: string
  source: string
  parentEmail: string
}

export type HouseholdEnrollmentRow = {
  id: string
  accountNumber: string | null
  programId: string
  programName: string
  studentName: string
  status: string
  feePaid: number
  transactionId: string
  parentEmail: string
  enrolledAt: string
  active: boolean
}

async function rowsForEmails(
  collection: string,
  emails: string[],
  emailField = 'parentEmail',
): Promise<Array<Record<string, unknown>>> {
  const client = getWixClient()
  const byId = new Map<string, Record<string, unknown>>()
  for (const email of emails) {
    try {
      const found = await client.items
        .query(collection)
        .eq(emailField, email)
        .limit(100)
        .find()
      for (const row of (found.items ?? []) as Array<Record<string, unknown>>) {
        const id = String(row._id || '')
        if (id) byId.set(id, row)
      }
    } catch {
      // continue
    }
  }
  return [...byId.values()]
}

export async function openHousehold(opts: {
  accountNumber?: string
  email?: string
}): Promise<Household | null> {
  const accountQ = normalizeAccountNumber(opts.accountNumber)
  const email = String(opts.email || '')
    .trim()
    .toLowerCase()

  if (accountQ) {
    const hh = await resolveHouseholdByAccountNumber(accountQ, email)
    return hh.accountNumber ? hh : null
  }
  if (email) {
    await ensureAccountNumberForEmail(email)
    const hh = await resolveHousehold({ email })
    return hh.accountNumber ? hh : null
  }
  return null
}

export async function loadHouseholdActivity(household: Household): Promise<{
  payments: HouseholdPaymentRow[]
  enrollments: HouseholdEnrollmentRow[]
}> {
  const emails = household.emails
  const [payRows, enrollRows] = await Promise.all([
    rowsForEmails('Payments', emails),
    rowsForEmails('ProgramEnrollments', emails),
  ])

  const payments: HouseholdPaymentRow[] = payRows
    .map((row) => ({
      id: String(row._id || ''),
      accountNumber: normalizeAccountNumber(row.accountNumber) || null,
      programName: String(row.programName || row.description || ''),
      amount: Number(row.amount || 0) || 0,
      status: String(row.status || ''),
      paymentDate: row.paymentDate
        ? new Date(String(row.paymentDate)).toISOString()
        : String(row._createdDate || ''),
      paymentMethod: String(row.paymentMethod || ''),
      transactionId: String(row.transactionId || row.squarePaymentId || ''),
      source: String(row.source || ''),
      parentEmail: String(row.parentEmail || row.payerEmail || '').toLowerCase(),
    }))
    .sort((a, b) => String(b.paymentDate).localeCompare(String(a.paymentDate)))

  const enrollments: HouseholdEnrollmentRow[] = enrollRows
    .map((row) => {
      const status = String(row.status || '')
      return {
        id: String(row._id || ''),
        accountNumber: normalizeAccountNumber(row.accountNumber) || null,
        programId: String(row.programId || ''),
        programName: String(row.programName || ''),
        studentName: String(row.studentName || ''),
        status,
        feePaid: Number(row.feePaid || 0) || 0,
        transactionId: String(row.transactionId || row.paymentId || ''),
        parentEmail: String(row.parentEmail || '').toLowerCase(),
        enrolledAt: row.enrolledAt
          ? new Date(String(row.enrolledAt)).toISOString()
          : String(row._createdDate || ''),
        active:
          ACTIVE_ENROLL_STATUSES.has(status) ||
          status === WAITLIST_STATUS ||
          status === 'RefundRequested' ||
          status === 'TransferRequested',
      }
    })
    .sort((a, b) => String(b.enrolledAt).localeCompare(String(a.enrolledAt)))

  return { payments, enrollments }
}

export function isEpishPayment(row: { programName?: string; source?: string; notes?: string }) {
  const blob = `${row.programName || ''} ${row.source || ''} ${row.notes || ''}`.toLowerCase()
  return (
    /enrichment|essay|robotics|competitive math|young entrepreneur|passion to pitch|stingray|program enroll|_program|_cart|repair_program/.test(
      blob,
    ) || /^bag/i.test(String(row.programName || ''))
  )
}
