/**
 * GET   /api/staff/expenses . list (own for most staff; all for treasurer/admin)
 * POST  /api/staff/expenses . submit a reimbursement request (any staff)
 * PATCH /api/staff/expenses . approve/reject (admin/president) or mark paid (treasurer/admin)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  createExpenseReimbursement,
  listExpenseReimbursements,
  setExpenseStatus,
  type ExpenseLineItem,
} from '@/lib/staff/expenses'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const canManage = requireStaffRole(session.staff, ['treasurer', 'admin'])
  const canApprove = requireStaffRole(session.staff, ['admin'])
  try {
    const expenses = canManage
      ? await listExpenseReimbursements()
      : await listExpenseReimbursements({ submittedByEmail: session.email })
    return NextResponse.json({ expenses, canManage, canApprove })
  } catch (err) {
    console.error('expenses GET', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to list reimbursements (create ExpenseReimbursements CMS collection if missing)',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const lineItems = (Array.isArray(body.lineItems) ? body.lineItems : []) as ExpenseLineItem[]
    const created = await createExpenseReimbursement({
      requestorName: String(body.requestorName ?? session.staff.name ?? ''),
      requestorEmail: String(body.requestorEmail ?? session.email ?? ''),
      requestorPhone: String(body.requestorPhone ?? ''),
      committeeEvent: String(body.committeeEvent ?? ''),
      dateOfRequest: String(body.dateOfRequest ?? ''),
      lineItems,
      paymentMethod: String(body.paymentMethod ?? 'Zelle'),
      paymentHandle: String(body.paymentHandle ?? ''),
      receiptUrls: Array.isArray(body.receiptUrls) ? body.receiptUrls.map(String) : [],
      notes: String(body.notes ?? ''),
      submittedByEmail: session.email,
    })
    return NextResponse.json({ ok: true, expense: created })
  } catch (err) {
    console.error('expenses POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to submit reimbursement' },
      { status: 400 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const id = String(body.id ?? '').trim()
    const action = String(body.action ?? '') as
      | 'approve'
      | 'reject'
      | 'markPaid'
      | 'reopen'
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const isApprovalAction = action === 'approve' || action === 'reject' || action === 'reopen'
    if (isApprovalAction && !requireStaffRole(session.staff, ['admin'])) {
      return NextResponse.json(
        { error: 'Only President / Admin can approve or reject' },
        { status: 403 }
      )
    }
    if (action === 'markPaid' && !requireStaffRole(session.staff, ['treasurer', 'admin'])) {
      return NextResponse.json(
        { error: 'Only Treasurer / Admin can mark paid' },
        { status: 403 }
      )
    }
    if (!['approve', 'reject', 'markPaid', 'reopen'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const updated = await setExpenseStatus({
      id,
      action,
      actorEmail: session.email,
      notes: body.notes != null ? String(body.notes) : undefined,
    })
    return NextResponse.json({ ok: true, expense: updated })
  } catch (err) {
    console.error('expenses PATCH', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update reimbursement' },
      { status: 400 }
    )
  }
}
