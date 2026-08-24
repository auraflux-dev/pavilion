import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { loadGiftCard } from '@/lib/square'
import { parseRefundAmountDollars } from '@/lib/refunds/refund-amount'
import {
  parsePaymentsListRange,
  resolvePaymentsListBounds,
} from '@/lib/staff/payments-list-range'
// account number lookup imported dynamically in GET

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['treasurer', 'admin'])) return null
  return session
}

export async function GET(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const sp = req.nextUrl.searchParams
    const onlyNeeds = sp.get('needs') === 'true'
    const range = parsePaymentsListRange(sp.get('range'), onlyNeeds)
    const accountQ = sp.get('account')?.trim() ?? ''
    const nameQ = sp.get('name')?.trim().toLowerCase() ?? ''
    const emailQ = sp.get('email')?.trim().toLowerCase() ?? ''
    const itemQ = sp.get('item')?.trim().toLowerCase() ?? ''
    const legacyQ = sp.get('q')?.trim().toLowerCase() ?? ''
    const amountRaw = sp.get('amount')?.trim() ?? ''
    const amountFilter =
      amountRaw === ''
        ? null
        : Math.round(parseFloat(amountRaw.replace(/[^0-9.]/g, '')) * 100) / 100
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(sp.get('pageSize') || '25', 10) || 25))

    let accountEmails: string[] = []
    if (accountQ) {
      const { lookupEmailsByAccountNumber, normalizeAccountNumber } = await import(
        '@/lib/staff/membership-account-number'
      )
      if (normalizeAccountNumber(accountQ)) {
        accountEmails = await lookupEmailsByAccountNumber(accountQ)
      }
    }

    let bounds: ReturnType<typeof resolvePaymentsListBounds> = null
    try {
      bounds = onlyNeeds
        ? null
        : resolvePaymentsListBounds({
            range,
            from: sp.get('from'),
            to: sp.get('to'),
          })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Invalid date range' },
        { status: 400 },
      )
    }

    const client = getWixClient()
    let query = client.items.query('Payments').descending('paymentDate').limit(200)
    if (onlyNeeds) query = query.eq('status', 'Needs Reconciliation')
    if (bounds) {
      query = query.ge('paymentDate', bounds.ge.toISOString()).lt('paymentDate', bounds.lt.toISOString())
    }
    const result = await query.find()
    const fetched = result.items?.length ?? 0
    let payments = (result.items ?? []).map((item) => {
      const row = item as Record<string, unknown>
      return {
        id: String(row._id ?? ''),
        studentId: String(row.studentId ?? ''),
        programName: String(row.programName ?? ''),
        amount: Number(row.amount ?? 0) || 0,
        status: String(row.status ?? ''),
        paymentDate: row.paymentDate ? new Date(String(row.paymentDate)).toISOString() : '',
        paymentMethod: String(row.paymentMethod ?? ''),
        transactionId: String(row.transactionId ?? ''),
        source: String(row.source ?? ''),
        payerEmail: String(row.payerEmail ?? ''),
        parentEmail: String(row.parentEmail ?? row.payerEmail ?? ''),
        payerName: String(row.payerName ?? ''),
        refundStatus: String(row.refundStatus ?? ''),
        refundedAmountDollars: parseRefundAmountDollars(row.refundedAmountDollars) ?? 0,
        syncedToMoneyMinder: row.syncedToMoneyMinder === true,
      }
    })

    if (accountQ) {
      if (accountEmails.length === 0) {
        payments = []
      } else {
        const set = new Set(accountEmails)
        payments = payments.filter(
          (p) => set.has(p.parentEmail.toLowerCase()) || set.has(p.payerEmail.toLowerCase()),
        )
      }
    }
    if (nameQ) {
      payments = payments.filter((p) => p.payerName.toLowerCase().includes(nameQ))
    }
    if (emailQ) {
      payments = payments.filter(
        (p) =>
          p.parentEmail.toLowerCase().includes(emailQ) ||
          p.payerEmail.toLowerCase().includes(emailQ),
      )
    }
    if (itemQ) {
      payments = payments.filter(
        (p) =>
          p.programName.toLowerCase().includes(itemQ) || p.source.toLowerCase().includes(itemQ),
      )
    }
    if (legacyQ) {
      payments = payments.filter(
        (p) =>
          p.payerName.toLowerCase().includes(legacyQ) ||
          p.payerEmail.toLowerCase().includes(legacyQ) ||
          p.parentEmail.toLowerCase().includes(legacyQ) ||
          p.transactionId.toLowerCase().includes(legacyQ) ||
          p.programName.toLowerCase().includes(legacyQ) ||
          p.source.toLowerCase().includes(legacyQ),
      )
    }
    if (amountFilter != null && Number.isFinite(amountFilter)) {
      payments = payments.filter((p) => Math.abs(p.amount - amountFilter) < 0.005)
    }

    const sort = String(sp.get('sort') ?? 'date').trim().toLowerCase()
    const sortDir = String(sp.get('dir') ?? 'desc').trim().toLowerCase() === 'asc' ? 1 : -1
    payments.sort((a, b) => {
      let cmp = 0
      if (sort === 'amount') {
        cmp = a.amount - b.amount
      } else if (sort === 'name') {
        const an = (a.payerName || a.parentEmail || a.payerEmail).toLowerCase()
        const bn = (b.payerName || b.parentEmail || b.payerEmail).toLowerCase()
        cmp = an.localeCompare(bn)
      } else if (sort === 'item') {
        cmp = a.programName.toLowerCase().localeCompare(b.programName.toLowerCase())
      } else {
        cmp = (a.paymentDate || '').localeCompare(b.paymentDate || '')
      }
      return cmp * sortDir
    })

    const total = payments.length
    const start = (page - 1) * pageSize
    const pageRows = payments.slice(start, start + pageSize)

    return NextResponse.json({
      payments: pageRows,
      total,
      page,
      pageSize,
      range: onlyNeeds ? 'all' : range,
      from: bounds?.fromYmd ?? '',
      to: bounds?.toYmd ?? '',
      sort,
      dir: sortDir === 1 ? 'asc' : 'desc',
      truncated: fetched >= 200,
    })
  } catch (err) {
    console.error('/api/staff/payments GET', err)
    return NextResponse.json({ error: 'Could not load payments' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const id = String(body.id ?? '').trim()
    const action = String(body.action ?? 'markPaid').trim()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const client = getWixClient()
    const existing = (await client.items.get('Payments', id)) as Record<string, unknown>
    if (!existing?._id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (action === 'retryLoad') {
      const studentId = String(existing.studentId ?? '').trim()
      const amount = Number(existing.amount ?? 0)
      if (!studentId || !(amount > 0)) {
        return NextResponse.json(
          { error: 'Payment needs a studentId and amount to retry gift-card load' },
          { status: 400 },
        )
      }
      const student = (await client.items.get('Students', studentId)) as {
        _id?: string
        squareGiftCardGan?: string
        storeCardBalance?: number
        firstName?: string
        lastName?: string
      }
      const gan = String(student.squareGiftCardGan ?? '').trim()
      if (!gan) {
        return NextResponse.json({ error: 'Student has no Square gift card GAN' }, { status: 400 })
      }
      const cents = Math.round(amount * 100)
      const idempotencyKey = `reconcile-load-${id}-${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 45)
      await loadGiftCard(gan, cents, idempotencyKey)
      const updates = {
        ...existing,
        _id: id,
        status: 'Paid',
        source: String(existing.source ?? '').includes('auto_topoff')
          ? 'square_auto_topoff'
          : 'square_store_card_reload',
      }
      await client.items.update('Payments', updates as Parameters<typeof client.items.update>[1])
      return NextResponse.json({ ok: true, message: 'Gift card loaded; payment marked Paid.' })
    }

    if (action === 'markRefunded') {
      const amount = Number(existing.amount ?? 0) || 0
      const prior = parseRefundAmountDollars(existing.refundedAmountDollars) ?? 0
      const refundedTotal = prior > 0 ? prior : amount
      const updates = {
        ...existing,
        _id: id,
        status: 'Refunded',
        refundStatus: 'refunded',
        refundedAmountDollars: String(refundedTotal),
        refundAmountDollars: String(refundedTotal),
        refundApprovedBy: session.staff?.email || session.email || '',
        refundApprovedAt: new Date().toISOString(),
        refundError: '',
        notes: [
          String(existing.notes ?? ''),
          `Marked refunded in Staff (already refunded in Square/PayPal) ${new Date().toISOString()}`,
        ]
          .filter(Boolean)
          .join(' · '),
      }
      await client.items.update('Payments', updates as Parameters<typeof client.items.update>[1])
      return NextResponse.json({
        ok: true,
        message: 'Marked refunded. No money moved. Square/PayPal was not called.',
      })
    }

    // markPaid. manual reconcile after verifying Square + fixing balance outside
    const updates = {
      ...existing,
      _id: id,
      status: 'Paid',
      syncedToMoneyMinder:
        body.syncedToMoneyMinder != null
          ? body.syncedToMoneyMinder === true
          : existing.syncedToMoneyMinder === true,
    }
    await client.items.update('Payments', updates as Parameters<typeof client.items.update>[1])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/staff/payments PATCH', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not update payment' },
      { status: 500 },
    )
  }
}
