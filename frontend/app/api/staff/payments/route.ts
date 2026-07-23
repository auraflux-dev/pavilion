import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { loadGiftCard } from '@/lib/square'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['treasurer', 'admin'])) return null
  return session
}

export async function GET(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const onlyNeeds = req.nextUrl.searchParams.get('needs') !== 'false'
    const client = getWixClient()
    let query = client.items.query('Payments').descending('paymentDate').limit(200)
    if (onlyNeeds) query = query.eq('status', 'Needs Reconciliation')
    const result = await query.find()
    const payments = (result.items ?? []).map((item) => {
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
        payerName: String(row.payerName ?? ''),
        syncedToMoneyMinder: row.syncedToMoneyMinder === true,
      }
    })
    return NextResponse.json({ payments })
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
