/**
 * Staging-only concurrent checkout loadtest helpers.
 * Hard-gated: Preview/dev + Square sandbox + CHECKOUT_LOADTEST_SECRET.
 * Never runs against production Square or www.shmspto.org.
 */
import { createHash, randomUUID, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'
import { consentItemsFor, type ConsentAck } from '@/lib/checkout-consent'
import { resolveCheckoutIntent, fulfillPaidCheckout } from '@/lib/checkout-fulfill'
import { chargePayment } from '@/lib/square'
import { getWixClient } from '@/lib/wix-client'

export const LOADTEST_EMAIL_DOMAIN = 'shmspto.loadtest'
/** Square Payments API sandbox success nonce (no Web Payments SDK). */
export const SQUARE_SANDBOX_CARD_NONCE = 'cnon:card-nonce-ok'

export type LoadtestGuardOk = { ok: true }
export type LoadtestGuardErr = { ok: false; status: number; error: string }

function secretsEqual(a: string, b: string): boolean {
  const ah = createHash('sha256').update(a).digest()
  const bh = createHash('sha256').update(b).digest()
  return timingSafeEqual(ah, bh)
}

export function assertCheckoutLoadtestAllowed(req: NextRequest): LoadtestGuardOk | LoadtestGuardErr {
  const secret = String(process.env.CHECKOUT_LOADTEST_SECRET ?? '').trim()
  if (!secret) {
    return { ok: false, status: 503, error: 'CHECKOUT_LOADTEST_SECRET is not configured' }
  }

  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token || !secretsEqual(token, secret)) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  const vercelEnv = String(process.env.VERCEL_ENV ?? '').toLowerCase()
  if (vercelEnv === 'production') {
    return { ok: false, status: 403, error: 'Checkout loadtest is blocked on production' }
  }

  const squareEnv = String(process.env.SQUARE_ENVIRONMENT ?? '').toLowerCase()
  if (squareEnv !== 'sandbox') {
    return {
      ok: false,
      status: 403,
      error: `Square must be sandbox for loadtest (got ${squareEnv || 'unset'})`,
    }
  }

  const host = String(req.headers.get('host') ?? '').toLowerCase()
  if (host.includes('shmspto.org') && !host.includes('vercel.app')) {
    return { ok: false, status: 403, error: 'Checkout loadtest is blocked on the production host' }
  }

  return { ok: true }
}

export function loadtestParentEmail(runId: string, workerId: number): string {
  const run = sanitizeId(runId, 16)
  return `lt.${run}.w${workerId}@${LOADTEST_EMAIL_DOMAIN}`
}

export function loadtestProgramConsents(): ConsentAck[] {
  const acceptedAt = new Date().toISOString()
  return consentItemsFor('program').map((item) => ({
    id: item.id,
    slug: item.slug,
    accepted: true,
    acceptedAt,
    docVersion: 'loadtest',
  }))
}

function sanitizeId(raw: string, max: number): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, max)
}

export async function pickLoadtestProgramId(explicit?: string): Promise<{
  programId: string
  programName: string
  fee: number
}> {
  const want = String(explicit ?? '').trim()
  if (want) {
    const { getProgramById } = await import('@/lib/api/programs')
    const match = await getProgramById(want)
    if (!match || Number(match.fee ?? 0) <= 0) {
      throw new Error(`Program ${want} not found or has no fee`)
    }
    return { programId: match._id, programName: match.name, fee: Number(match.fee) }
  }

  // Do not use getPrograms() (registrationOpen only). Staging resolve force-opens closed rows.
  const client = getWixClient()
  const result = await client.items.query('Programs').limit(100).find()
  type Row = {
    _id: string
    name: string
    fee: number
    category?: string
    fallEpClassId?: string
  }
  const mapped: Row[] = (result.items as Record<string, unknown>[]).map((item) => ({
    _id: String(item._id ?? ''),
    name: String(item.name ?? ''),
    fee: Number(item.fee ?? 0) || 0,
    category: item.category ? String(item.category) : undefined,
    fallEpClassId: item.fallEpClassId ? String(item.fallEpClassId) : undefined,
  }))
  const paid = mapped.filter(
    (p) => p._id && p.fee > 0 && !/\bqa\b|loadtest|cms.?qa/i.test(p.name),
  )
  const fall =
    paid.find((p) => String(p.fallEpClassId ?? '').trim().length > 0) ??
    paid.find((p) => /fall|2026/i.test(`${p.name} ${p.category ?? ''}`)) ??
    paid[0]
  if (!fall) throw new Error('No paid programs available for loadtest')
  return { programId: fall._id, programName: fall.name, fee: Number(fall.fee) }
}

export async function ensureLoadtestStudent(opts: {
  runId: string
  workerId: number
  parentEmail: string
}): Promise<{ studentId: string; created: boolean }> {
  const client = getWixClient()
  const parentEmail = opts.parentEmail.trim().toLowerCase()
  const lastName = `LT${sanitizeId(opts.runId, 12)}`
  const firstName = `W${opts.workerId}`

  const existing = await client.items
    .query('Students')
    .eq('parentEmail', parentEmail)
    .eq('firstName', firstName)
    .eq('lastName', lastName)
    .limit(1)
    .find()
    .catch(() => ({ items: [] as unknown[] }))

  const row = (existing.items?.[0] ?? null) as { _id?: string } | null
  if (row?._id) {
    return { studentId: String(row._id), created: false }
  }

  const inserted = await client.items.insert('Students', {
    firstName,
    lastName,
    grade: '3',
    parentEmail,
    parentFirstName: 'Load',
    parentLastName: 'Test',
    membershipTier: 'free',
    membershipStatus: 'active',
    storeCardBalance: 0,
    discountCode: null,
    jumbulaSid: '',
    allergies: 'none (loadtest)',
    emergencyContact: 'Loadtest Emergency',
    emergencyPhone: '555-0100',
    parentPhone: '555-0101',
    secondaryPhone: '',
    medicalConditions: '',
    medications: '',
    pickupAuthorized: 'Loadtest Pickup',
    selfRelease: false,
    photoMediaConsent: true,
  })

  const studentId = String(
    (inserted as { _id?: string })._id ??
      (inserted as { id?: string }).id ??
      (inserted as { dataItem?: { id?: string } }).dataItem?.id ??
      '',
  )
  if (!studentId) throw new Error('Failed to create loadtest student')
  return { studentId, created: true }
}

export type LoadtestWorkerResult = {
  ok: boolean
  runId: string
  workerId: number
  parentEmail: string
  programId: string
  programName: string
  studentId: string
  amountCents: number
  paymentId?: string
  enrollmentId?: string
  enrollmentStatus?: string
  outcome: 'ok' | 'pay_fail' | 'pay_ok_fulfill_fail' | 'error'
  error?: string
  t_total_ms: number
  t_pay_ms?: number
  t_fulfill_ms?: number
}

export async function runLoadtestWorker(opts: {
  runId: string
  workerId: number
  programId?: string
}): Promise<LoadtestWorkerResult> {
  const t0 = Date.now()
  const runId = sanitizeId(opts.runId, 24) || randomUUID().slice(0, 12)
  const workerId = Math.max(0, Math.floor(Number(opts.workerId) || 0))
  const parentEmail = loadtestParentEmail(runId, workerId)
  const parentName = `Load Test W${workerId}`

  try {
    const program = await pickLoadtestProgramId(opts.programId)
    const student = await ensureLoadtestStudent({ runId, workerId, parentEmail })
    const consents = loadtestProgramConsents()

    const resolved = await resolveCheckoutIntent(
      {
        kind: 'program',
        programId: program.programId,
        studentId: student.studentId,
      },
      parentEmail,
      [parentEmail],
    )

    const paymentKey = randomUUID()
    const referenceId = `lt:${runId}:${workerId}`.slice(0, 40)
    let paymentId = ''
    const tPay0 = Date.now()
    try {
      const payment = await chargePayment({
        sourceId: SQUARE_SANDBOX_CARD_NONCE,
        amountCents: resolved.amountCents,
        idempotencyKey: paymentKey,
        referenceId,
        buyerEmailAddress: parentEmail,
        note: `loadtest:${runId}:w${workerId}`,
      })
      paymentId = String(payment.id ?? paymentKey)
    } catch (err) {
      return {
        ok: false,
        runId,
        workerId,
        parentEmail,
        programId: program.programId,
        programName: program.programName,
        studentId: student.studentId,
        amountCents: resolved.amountCents,
        outcome: 'pay_fail',
        error: err instanceof Error ? err.message : String(err),
        t_total_ms: Date.now() - t0,
        t_pay_ms: Date.now() - tPay0,
      }
    }
    const tPay = Date.now() - tPay0

    const tFulfill0 = Date.now()
    try {
      const fulfilled = await fulfillPaidCheckout({
        resolved,
        parentEmail,
        parentName,
        transactionId: paymentId,
        paymentMethod: 'Square (loadtest)',
        sourcePrefix: 'square',
        consents,
        skipConfirmation: true,
      })
      const tFulfill = Date.now() - tFulfill0

      // Tag Payments row notes for cleanup (best-effort update).
      try {
        const client = getWixClient()
        const found = await client.items
          .query('Payments')
          .eq('transactionId', paymentId)
          .limit(1)
          .find()
        const payRow = found.items?.[0] as { _id?: string; notes?: string } | undefined
        if (payRow?._id) {
          await client.items.update('Payments', {
            ...payRow,
            _id: payRow._id,
            notes: [payRow.notes, `loadtest:${runId}`].filter(Boolean).join(' · '),
          } as never)
        }
      } catch {
        // ignore tag failures
      }

      return {
        ok: true,
        runId,
        workerId,
        parentEmail,
        programId: program.programId,
        programName: program.programName,
        studentId: student.studentId,
        amountCents: resolved.amountCents,
        paymentId,
        enrollmentId: String(fulfilled.enrollmentId ?? ''),
        enrollmentStatus: String(fulfilled.status ?? ''),
        outcome: 'ok',
        t_total_ms: Date.now() - t0,
        t_pay_ms: tPay,
        t_fulfill_ms: tFulfill,
      }
    } catch (err) {
      return {
        ok: false,
        runId,
        workerId,
        parentEmail,
        programId: program.programId,
        programName: program.programName,
        studentId: student.studentId,
        amountCents: resolved.amountCents,
        paymentId,
        outcome: 'pay_ok_fulfill_fail',
        error: err instanceof Error ? err.message : String(err),
        t_total_ms: Date.now() - t0,
        t_pay_ms: tPay,
        t_fulfill_ms: Date.now() - tFulfill0,
      }
    }
  } catch (err) {
    return {
      ok: false,
      runId,
      workerId,
      parentEmail,
      programId: String(opts.programId ?? ''),
      programName: '',
      studentId: '',
      amountCents: 0,
      outcome: 'error',
      error: err instanceof Error ? err.message : String(err),
      t_total_ms: Date.now() - t0,
    }
  }
}

export async function cleanupLoadtestRun(runIdRaw: string): Promise<{
  runId: string
  deletedStudents: number
  deletedEnrollments: number
  deletedPayments: number
  deletedLegacyEnrollments: number
}> {
  const runId = sanitizeId(runIdRaw, 24)
  if (!runId) throw new Error('runId required')
  const client = getWixClient()
  const lastName = `LT${runId.slice(0, 12)}`
  const emailPrefix = `lt.${runId}.`

  let deletedStudents = 0
  let deletedEnrollments = 0
  let deletedPayments = 0
  let deletedLegacyEnrollments = 0

  const students = await client.items
    .query('Students')
    .eq('lastName', lastName)
    .limit(100)
    .find()
    .catch(() => ({ items: [] as unknown[] }))

  for (const item of students.items ?? []) {
    const row = item as { _id?: string; parentEmail?: string }
    const email = String(row.parentEmail ?? '').toLowerCase()
    if (!email.startsWith(emailPrefix) || !email.endsWith(`@${LOADTEST_EMAIL_DOMAIN}`)) continue
    const id = String(row._id ?? '')
    if (!id) continue

    const enrollments = await client.items
      .query('ProgramEnrollments')
      .eq('studentId', id)
      .limit(50)
      .find()
      .catch(() => ({ items: [] as unknown[] }))
    for (const en of enrollments.items ?? []) {
      const eid = String((en as { _id?: string })._id ?? '')
      if (!eid) continue
      await client.items.remove('ProgramEnrollments', eid).catch(() => null)
      deletedEnrollments += 1
    }

    const legacy = await client.items
      .query('Enrollments')
      .eq('studentId', id)
      .limit(50)
      .find()
      .catch(() => ({ items: [] as unknown[] }))
    for (const en of legacy.items ?? []) {
      const eid = String((en as { _id?: string })._id ?? '')
      if (!eid) continue
      await client.items.remove('Enrollments', eid).catch(() => null)
      deletedLegacyEnrollments += 1
    }

    const payments = await client.items
      .query('Payments')
      .eq('parentEmail', email)
      .limit(50)
      .find()
      .catch(() => ({ items: [] as unknown[] }))
    for (const pay of payments.items ?? []) {
      const pid = String((pay as { _id?: string })._id ?? '')
      if (!pid) continue
      await client.items.remove('Payments', pid).catch(() => null)
      deletedPayments += 1
    }

    await client.items.remove('Students', id).catch(() => null)
    deletedStudents += 1
  }

  return {
    runId,
    deletedStudents,
    deletedEnrollments,
    deletedPayments,
    deletedLegacyEnrollments,
  }
}
