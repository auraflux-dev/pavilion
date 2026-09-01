/**
 * POST /api/cron/backfill-ep-account-numbers
 * Auth: Bearer $CRON_SECRET
 *
 * One-time / repeatable: stamp Memberships A##### onto ProgramEnrollments and
 * Payments rows that are missing accountNumber (EP-focused by default).
 *
 * Body: { dryRun?: boolean, since?: ISO date, limit?: number, allPayments?: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import {
  ensureAccountNumberForEmail,
  normalizeAccountNumber,
} from '@/lib/staff/membership-account-number'
import { isEpishPayment } from '@/lib/staff/household-activity'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorize(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET?.trim()
  return Boolean(secret && auth === `Bearer ${secret}`)
}

async function pageCollection(collection: string, since?: string) {
  const client = getWixClient()
  const out: Array<Record<string, unknown>> = []
  let result = await client.items
    .query(collection)
    .limit(100)
    .descending('_createdDate')
    .find()
  out.push(...((result.items ?? []) as Array<Record<string, unknown>>))
  let guard = 0
  while (result.hasNext?.() && guard < 30) {
    result = await result.next()
    out.push(...((result.items ?? []) as Array<Record<string, unknown>>))
    guard += 1
    if (since) {
      const oldest = out[out.length - 1]
      const created = String(oldest?._createdDate || oldest?.paymentDate || oldest?.enrolledAt || '')
      if (created && created < since) break
    }
  }
  if (since) {
    return out.filter((row) => {
      const created = String(row._createdDate || row.paymentDate || row.enrolledAt || '')
      return !created || created >= since
    })
  }
  return out
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    dryRun?: boolean
    since?: string
    limit?: number
    allPayments?: boolean
  }
  const dryRun = Boolean(body.dryRun)
  const since = String(body.since || '2026-08-15T00:00:00.000Z')
  const limit = Math.min(500, Math.max(1, Number(body.limit || 200)))
  const allPayments = Boolean(body.allPayments)

  try {
    const client = getWixClient()
    const [enrollments, payments] = await Promise.all([
      pageCollection('ProgramEnrollments', since),
      pageCollection('Payments', since),
    ])

    const enrollNeed = enrollments
      .filter((row) => !normalizeAccountNumber(row.accountNumber))
      .filter((row) => String(row.parentEmail || '').includes('@'))
      .slice(0, limit)

    const payNeed = payments
      .filter((row) => !normalizeAccountNumber(row.accountNumber))
      .filter((row) => String(row.parentEmail || row.payerEmail || '').includes('@'))
      .filter((row) =>
        allPayments
          ? true
          : isEpishPayment({
              programName: String(row.programName || ''),
              source: String(row.source || ''),
              notes: String(row.notes || ''),
            }),
      )
      .slice(0, limit)

    const cache = new Map<string, string>()
    async function numberFor(emailRaw: string) {
      const email = emailRaw.trim().toLowerCase()
      if (!email) return ''
      if (cache.has(email)) return cache.get(email) || ''
      const n = await ensureAccountNumberForEmail(email)
      cache.set(email, n)
      return n
    }

    const enrollUpdates: Array<{ id: string; accountNumber: string }> = []
    for (const row of enrollNeed) {
      const email = String(row.parentEmail || '').trim().toLowerCase()
      const accountNumber = await numberFor(email)
      if (!accountNumber || !row._id) continue
      enrollUpdates.push({ id: String(row._id), accountNumber })
      if (!dryRun) {
        await client.items.update('ProgramEnrollments', {
          ...row,
          _id: row._id,
          accountNumber,
        } as never)
      }
    }

    const paymentUpdates: Array<{ id: string; accountNumber: string }> = []
    for (const row of payNeed) {
      const email = String(row.parentEmail || row.payerEmail || '')
        .trim()
        .toLowerCase()
      const accountNumber = await numberFor(email)
      if (!accountNumber || !row._id) continue
      paymentUpdates.push({ id: String(row._id), accountNumber })
      if (!dryRun) {
        await client.items.update('Payments', {
          ...row,
          _id: row._id,
          accountNumber,
        } as never)
      }
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      since,
      scanned: { enrollments: enrollments.length, payments: payments.length },
      stamped: {
        enrollments: enrollUpdates.length,
        payments: paymentUpdates.length,
        householdsTouched: cache.size,
      },
      sampleAccounts: [...new Set([...enrollUpdates, ...paymentUpdates].map((u) => u.accountNumber))]
        .sort()
        .slice(0, 40),
    })
  } catch (err) {
    console.error('backfill-ep-account-numbers', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'backfill failed' },
      { status: 500 },
    )
  }
}
