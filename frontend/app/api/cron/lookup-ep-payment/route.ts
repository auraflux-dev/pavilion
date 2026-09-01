/**
 * POST /api/cron/lookup-ep-payment
 * Auth: Bearer $CRON_SECRET
 *
 * Account-first household activity lookup.
 *
 * Body: {
 *   accountNumber?: string   // preferred entry (A#####)
 *   parentEmail?: string     // entry key only → resolved to accountNumber first
 *   transactionId?: string   // find payment → then open that household
 *   amount?: number
 * }
 *
 * Always returns: accountNumber at the top, then emails, payments, enrollments
 * underneath. Email alone is never treated as the household root.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { ACTIVE_ENROLL_STATUSES } from '@/lib/programs/enrollments'
import {
  ensureAccountNumberForEmail,
  normalizeAccountNumber,
  resolveHousehold,
  resolveHouseholdByAccountNumber,
} from '@/lib/staff/membership-account-number'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorize(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET?.trim()
  return Boolean(secret && auth === `Bearer ${secret}`)
}

function redactEmail(email: string) {
  const e = String(email || '').toLowerCase()
  const at = e.indexOf('@')
  if (at < 1) return '[email]'
  return `${e.slice(0, 2)}…${e.slice(at)}`
}

async function paymentsForEmails(
  emails: string[],
  opts?: { amount?: number | null; transactionId?: string },
) {
  const client = getWixClient()
  const byId = new Map<string, Record<string, unknown>>()
  for (const email of emails) {
    try {
      const found = await client.items
        .query('Payments')
        .eq('parentEmail', email)
        .limit(50)
        .find()
      for (const row of (found.items ?? []) as Array<Record<string, unknown>>) {
        const id = String(row._id || '')
        if (id) byId.set(id, row)
      }
    } catch {
      // continue
    }
  }
  let rows = [...byId.values()]
  if (opts?.transactionId) {
    const tx = opts.transactionId
    rows = rows.filter((row) => {
      const t = String(row.transactionId || row.squarePaymentId || '')
      return t === tx || t.startsWith(`${tx}:`) || t.includes(tx)
    })
  }
  if (opts?.amount != null && Number.isFinite(opts.amount)) {
    const amt = Number(opts.amount)
    rows = rows.filter((row) => Math.abs(Number(row.amount || 0) - amt) < 0.02)
  }
  return rows
}

async function enrollmentsForEmails(emails: string[], transactionId?: string) {
  const client = getWixClient()
  const byId = new Map<string, Record<string, unknown>>()
  for (const email of emails) {
    try {
      const found = await client.items
        .query('ProgramEnrollments')
        .eq('parentEmail', email)
        .limit(50)
        .find()
      for (const row of (found.items ?? []) as Array<Record<string, unknown>>) {
        const id = String(row._id || '')
        if (id) byId.set(id, row)
      }
    } catch {
      // continue
    }
  }
  let rows = [...byId.values()]
  if (transactionId) {
    rows = rows.filter((row) => {
      const t = String(row.transactionId || row.paymentId || row.squarePaymentId || '')
      return t === transactionId || t.includes(transactionId)
    })
  }
  return rows
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    accountNumber?: string
    transactionId?: string
    parentEmail?: string
    amount?: number
  }
  const entryAccount = normalizeAccountNumber(body.accountNumber)
  const transactionId = String(body.transactionId || '').trim()
  const parentEmail = String(body.parentEmail || '').trim().toLowerCase()
  const amount = body.amount != null ? Number(body.amount) : null

  if (!entryAccount && !transactionId && !parentEmail) {
    return NextResponse.json(
      { error: 'accountNumber, parentEmail, or transactionId required' },
      { status: 400 },
    )
  }

  try {
    const client = getWixClient()

    // 1) Prefer explicit account number
    // 2) Else resolve email → accountNumber first (never treat email as root)
    // 3) Else find payment by tx → parentEmail → accountNumber
    let household = entryAccount
      ? await resolveHouseholdByAccountNumber(entryAccount, parentEmail)
      : null

    if (!household?.accountNumber && parentEmail) {
      await ensureAccountNumberForEmail(parentEmail)
      household = await resolveHousehold({ email: parentEmail })
    }

    if (!household?.accountNumber && transactionId) {
      let payRow: Record<string, unknown> | null = null
      try {
        const byTx = await client.items
          .query('Payments')
          .eq('transactionId', transactionId)
          .limit(5)
          .find()
        payRow = (byTx.items?.[0] as Record<string, unknown>) || null
      } catch {
        payRow = null
      }
      if (!payRow) {
        const recent = await client.items
          .query('Payments')
          .limit(100)
          .descending('_createdDate')
          .find()
        payRow =
          ((recent.items ?? []) as Array<Record<string, unknown>>).find((row) => {
            const tx = String(row.transactionId || row.squarePaymentId || '')
            return (
              tx === transactionId ||
              tx.startsWith(`${transactionId}:`) ||
              tx.includes(transactionId)
            )
          }) || null
      }
      const stamped = normalizeAccountNumber(payRow?.accountNumber)
      const payEmail = String(payRow?.parentEmail || '')
        .trim()
        .toLowerCase()
      if (stamped) {
        household = await resolveHouseholdByAccountNumber(stamped, payEmail)
      } else if (payEmail) {
        await ensureAccountNumberForEmail(payEmail)
        household = await resolveHousehold({ email: payEmail })
      }
    }

    if (!household?.accountNumber) {
      return NextResponse.json({
        ok: false,
        error: 'Could not resolve household account number',
        query: {
          accountNumber: entryAccount || null,
          parent: parentEmail ? redactEmail(parentEmail) : null,
          transactionIdPrefix: transactionId ? transactionId.slice(0, 12) : null,
        },
      })
    }

    const emails = household.emails
    const paymentItems = await paymentsForEmails(emails, {
      amount,
      transactionId: transactionId || undefined,
    })
    const enrollItems = await enrollmentsForEmails(
      emails,
      transactionId || undefined,
    )

    const payments = paymentItems.map((row) => ({
      id: String(row._id || '').slice(0, 8),
      accountNumber: normalizeAccountNumber(row.accountNumber) || null,
      amount: Number(row.amount || 0),
      method: String(row.paymentMethod || ''),
      source: String(row.source || ''),
      description: String(row.description || row.programName || row.notes || '').slice(
        0,
        120,
      ),
      created: String(row._createdDate || ''),
      parent: redactEmail(String(row.parentEmail || '')),
      txPrefix: String(row.transactionId || row.squarePaymentId || '').slice(0, 12),
    }))

    const enrollments = enrollItems.map((row) => ({
      id: String(row._id || '').slice(0, 8),
      accountNumber: normalizeAccountNumber(row.accountNumber) || null,
      programName: String(row.programName || '').slice(0, 80),
      status: String(row.status || ''),
      feePaid: Number(row.feePaid || 0),
      active: ACTIVE_ENROLL_STATUSES.has(String(row.status || '')),
      created: String(row._createdDate || ''),
      parent: redactEmail(String(row.parentEmail || '')),
      txPrefix: String(row.transactionId || row.paymentId || '').slice(0, 12),
    }))

    return NextResponse.json({
      ok: true,
      account: {
        accountNumber: household.accountNumber,
        emails: household.emails.map(redactEmail),
        primaryEmail: redactEmail(household.primaryEmail),
        tiers: household.tierCandidates.slice(0, 8),
        studentCount: household.students.length,
      },
      activity: {
        paymentRows: payments.length,
        enrollmentRows: enrollments.length,
        activeEnrollments: enrollments.filter((e) => e.active).length,
        payments,
        enrollments,
      },
      verdict:
        payments.length > 0 && enrollments.some((e) => e.active)
          ? 'payment_and_seat'
          : payments.length > 0
            ? 'payment_no_seat'
            : enrollments.some((e) => e.active)
              ? 'seat_no_payment_row'
              : 'neither',
    })
  } catch (err) {
    console.error('lookup-ep-payment', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'lookup failed' },
      { status: 500 },
    )
  }
}
