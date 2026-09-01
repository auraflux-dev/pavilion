/**
 * POST /api/cron/repair-ep-enrollment
 * Auth: Bearer $CRON_SECRET
 *
 * Create missing Paid ProgramEnrollments after money already cleared
 * (Square/PayPal) but fulfill failed or POS sync poisoned the ledger.
 *
 * Body: {
 *   accountNumber: string,
 *   transactionId: string,
 *   dryRun?: boolean,
 *   lines: Array<{
 *     programNameContains: string,
 *     season?: 'fall-2026' | 'spring-2027',
 *     feePaid: number
 *   }>
 * }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import {
  ACTIVE_ENROLL_STATUSES,
  WAITLIST_STATUS,
  countSeatsTaken,
} from '@/lib/programs/enrollments'
import {
  normalizeAccountNumber,
  resolveHouseholdByAccountNumber,
} from '@/lib/staff/membership-account-number'
import { sendPurchaseConfirmation } from '@/lib/purchase-confirmation'
import { reportError } from '@/lib/observability/error-reporting'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorize(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET?.trim()
  return Boolean(secret && auth === `Bearer ${secret}`)
}

function nameMatch(hay: string, needle: string) {
  const h = hay.toLowerCase()
  const n = needle.toLowerCase().trim()
  if (!n) return false
  return n.split(/\s+/).every((w) => h.includes(w))
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      accountNumber?: string
      transactionId?: string
      dryRun?: boolean
      notify?: boolean
      lines?: Array<{
        programNameContains?: string
        season?: string
        feePaid?: number
      }>
    }

    const accountNumber = normalizeAccountNumber(body.accountNumber)
    const transactionId = String(body.transactionId || '').trim()
    const dryRun = Boolean(body.dryRun)
    const notify = body.notify === true
    const lines = Array.isArray(body.lines) ? body.lines : []

    if (!accountNumber || !transactionId || lines.length === 0) {
      return NextResponse.json(
        { error: 'accountNumber, transactionId, and lines[] required' },
        { status: 400 },
      )
    }

    const household = await resolveHouseholdByAccountNumber(accountNumber)
    if (!household.accountNumber || household.emails.length === 0) {
      return NextResponse.json({ error: 'Household not found', accountNumber }, { status: 404 })
    }

    const students = household.students.filter((s) => !s.archived)
    if (students.length === 0) {
      return NextResponse.json(
        { error: 'No students on household', accountNumber },
        { status: 404 },
      )
    }
    if (students.length > 1) {
      return NextResponse.json(
        {
          error: 'Multiple students — pass studentId in a follow-up if needed',
          studentCount: students.length,
        },
        { status: 409 },
      )
    }

    const student = students[0]
    const studentId = String(student._id || '')
    const studentName =
      `${String(student.firstName || '')} ${String(student.lastName || '')}`.trim() ||
      'Student'
    const parentEmail = household.primaryEmail || household.emails[0]

    const client = getWixClient()
    const programs = await client.items.query('Programs').limit(200).find()
    const programRows = (programs.items ?? []) as Array<Record<string, unknown>>

    const existing = await client.items
      .query('ProgramEnrollments')
      .eq('parentEmail', parentEmail)
      .limit(50)
      .find()
    const existingRows = (existing.items ?? []) as Array<Record<string, unknown>>

    const plan: Array<Record<string, unknown>> = []
    for (const line of lines) {
      const needle = String(line.programNameContains || '').trim()
      const season = String(line.season || '').trim()
      const feePaid = Number(line.feePaid || 0)
      if (!needle) continue

      const dest = programRows.find((p) => {
        const name = String(p.name ?? p.title ?? '')
        if (!nameMatch(name, needle)) return false
        if (season) {
          const s = String(p.season ?? '')
          if (s !== season) return false
        }
        return true
      })
      if (!dest?._id) {
        return NextResponse.json(
          { error: 'Program not found', needle, season },
          { status: 404 },
        )
      }

      const programId = String(dest._id)
      const programName = String(dest.name ?? dest.title ?? needle)
      const already = existingRows.find((row) => {
        const status = String(row.status || '')
        if (!ACTIVE_ENROLL_STATUSES.has(status) && status !== WAITLIST_STATUS) return false
        return String(row.programId || '') === programId
      })

      const capacity = Number(dest.capacity ?? 0) || 0
      const seatsTaken = capacity > 0 ? await countSeatsTaken(programId) : 0

      plan.push({
        programId,
        programName,
        season: String(dest.season || season || ''),
        feePaid,
        alreadyEnrolled: Boolean(already),
        existingEnrollmentId: already?._id ? String(already._id) : null,
        seatsTaken,
        capacity,
      })
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        accountNumber,
        parentEmail: parentEmail.replace(/^(.{2}).*(@.*)$/, '$1…$2'),
        studentName: '[name]',
        studentId: studentId.slice(0, 8),
        transactionIdPrefix: transactionId.slice(0, 12),
        plan,
      })
    }

    const created: Array<Record<string, unknown>> = []
    const now = new Date().toISOString()
    for (const row of plan) {
      if (row.alreadyEnrolled) {
        created.push({ ...row, action: 'skipped_existing' })
        continue
      }
      const capacity = Number(row.capacity || 0)
      const seatsTaken = Number(row.seatsTaken || 0)
      if (capacity > 0 && seatsTaken >= capacity) {
        return NextResponse.json(
          { error: 'Class full', programName: row.programName, seatsTaken, capacity },
          { status: 409 },
        )
      }

      const inserted = await client.items.insert('ProgramEnrollments', {
        programId: row.programId,
        programName: row.programName,
        studentId,
        studentName,
        parentEmail,
        accountNumber,
        status: 'Paid',
        feePaid: Number(row.feePaid || 0),
        transactionId,
        enrolledAt: now,
        waitlistPosition: null,
        repairNote: `Repaired ${now} after paid checkout without seat`,
      })

      // Ledger payment row so Staff Payments shows Enrichment (not only Stand poison)
      await client.items.insert('Payments', {
        programName: `Enrichment: ${row.programName}`,
        amount: Number(row.feePaid || 0),
        status: 'Paid',
        paymentDate: now,
        paymentMethod: 'Square Card',
        transactionId:
          Number(row.feePaid || 0) > 0
            ? transactionId
            : `${transactionId}:addon:${String(row.programId).replace(/-/g, '').slice(0, 8)}`,
        source: 'repair_program',
        parentEmail,
        accountNumber,
        studentId,
        notes: `Repair seat for ${accountNumber} · original tx ${transactionId.slice(0, 16)}`,
      })

      created.push({
        ...row,
        action: 'created',
        enrollmentId: String((inserted as { _id?: string })._id || '').slice(0, 8),
      })
    }

    if (notify) {
      const total = plan.reduce((s, r) => s + Number(r.feePaid || 0), 0)
      await sendPurchaseConfirmation({
        kind: 'program',
        parentEmail,
        parentName: 'Parent',
        amount: total,
        description: plan.map((p) => String(p.programName)).join(' + '),
        transactionId,
        meta: {
          programName: plan.map((p) => String(p.programName)).join(' + ').slice(0, 160),
          accountNumber,
        },
      }).catch((err) => console.error('repair notify', err))
    }

    return NextResponse.json({
      ok: true,
      accountNumber,
      transactionIdPrefix: transactionId.slice(0, 12),
      created,
    })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/cron/repair-ep-enrollment' })
    console.error('repair-ep-enrollment', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'repair failed', eventId },
      { status: 500 },
    )
  }
}
