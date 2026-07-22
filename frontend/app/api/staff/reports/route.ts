/**
 * GET /api/staff/reports?focus=programs|cove|payments|membership|events&from=&to=
 * Role-gated tabular data for Staff Reports workspace.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { canManageAllPrograms, scopedProgramIds } from '@/lib/staff/roles'
import { listProgramEnrollments } from '@/lib/programs/enrollments'

export const dynamic = 'force-dynamic'

type Focus = 'programs' | 'cove' | 'payments' | 'membership' | 'events'

function parseFocus(raw: string | null): Focus | null {
  if (!raw) return null
  if (['programs', 'cove', 'payments', 'membership', 'events'].includes(raw)) {
    return raw as Focus
  }
  return null
}

function inRange(iso: string | null | undefined, from: string, to: string) {
  if (!iso) return !from && !to
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  if (from) {
    const f = new Date(from).getTime()
    if (!Number.isNaN(f) && t < f) return false
  }
  if (to) {
    const end = new Date(to)
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999)
      if (t > end.getTime()) return false
    }
  }
  return true
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const focus = parseFocus(req.nextUrl.searchParams.get('focus'))
  const from = req.nextUrl.searchParams.get('from')?.trim() || ''
  const to = req.nextUrl.searchParams.get('to')?.trim() || ''
  if (!focus) {
    return NextResponse.json({ error: 'focus required' }, { status: 400 })
  }

  const staff = session.staff
  const client = getWixClient()

  try {
    if (focus === 'programs') {
      if (
        !requireStaffRole(staff, ['programs', 'instructor', 'coordinator', 'admin'])
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const programId = req.nextUrl.searchParams.get('programId')?.trim() || ''
      const scoped = scopedProgramIds(staff)
      if (programId) {
        if (scoped && !scoped.includes(programId) && !canManageAllPrograms(staff)) {
          return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
        }
        const rows = await listProgramEnrollments(programId)
        const filtered = rows.filter((r) =>
          inRange(String(r.enrolledAt ?? r.registrationDate ?? ''), from, to),
        )
        return NextResponse.json({
          focus,
          columns: [
            'studentName',
            'parentEmail',
            'status',
            'feePaid',
            'enrolledAt',
            'waitlistPosition',
          ],
          rows: filtered.map((r) => ({
            id: r._id,
            studentName: r.studentName ?? '',
            parentEmail: r.parentEmail ?? '',
            status: r.status ?? '',
            feePaid: r.feePaid ?? 0,
            enrolledAt: r.enrolledAt ?? r.registrationDate ?? '',
            waitlistPosition: r.waitlistPosition ?? '',
          })),
        })
      }

      // All enrollments in scope (cap)
      const found = await client.items
        .query('ProgramEnrollments')
        .limit(200)
        .find()
        .catch(() => ({ items: [] }))
      let rows = (found.items ?? []) as Record<string, unknown>[]
      if (scoped) {
        const set = new Set(scoped)
        rows = rows.filter((r) => set.has(String(r.programId ?? '')))
      }
      rows = rows.filter((r) => inRange(String(r.enrolledAt ?? ''), from, to))
      return NextResponse.json({
        focus,
        columns: [
          'programName',
          'studentName',
          'parentEmail',
          'status',
          'feePaid',
          'enrolledAt',
        ],
        rows: rows.map((r) => ({
          id: String(r._id ?? ''),
          programName: String(r.programName ?? ''),
          studentName: String(r.studentName ?? ''),
          parentEmail: String(r.parentEmail ?? ''),
          status: String(r.status ?? ''),
          feePaid: Number(r.feePaid ?? 0) || 0,
          enrolledAt: String(r.enrolledAt ?? ''),
        })),
      })
    }

    if (focus === 'payments' || focus === 'cove') {
      if (focus === 'payments' && !requireStaffRole(staff, ['treasurer', 'admin'])) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (
        focus === 'cove' &&
        !requireStaffRole(staff, ['retail', 'treasurer', 'admin'])
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const found = await client.items
        .query('Payments')
        .descending('paymentDate')
        .limit(300)
        .find()
        .catch(() => ({ items: [] }))
      let rows = (found.items ?? []) as Record<string, unknown>[]
      rows = rows.filter((r) => inRange(String(r.paymentDate ?? ''), from, to))
      if (focus === 'cove') {
        rows = rows.filter((r) => {
          const src = String(r.source ?? '').toLowerCase()
          const name = String(r.programName ?? '').toLowerCase()
          return (
            src.includes('cove') ||
            src.includes('store_card') ||
            name.includes('cove') ||
            name.includes('store card')
          )
        })
      }
      return NextResponse.json({
        focus,
        columns: [
          'programName',
          'parentEmail',
          'amount',
          'status',
          'paymentMethod',
          'paymentDate',
          'source',
          'transactionId',
        ],
        rows: rows.map((r) => ({
          id: String(r._id ?? ''),
          programName: String(r.programName ?? ''),
          parentEmail: String(r.parentEmail ?? ''),
          amount: Number(r.amount ?? 0) || 0,
          status: String(r.status ?? ''),
          paymentMethod: String(r.paymentMethod ?? ''),
          paymentDate: String(r.paymentDate ?? ''),
          source: String(r.source ?? ''),
          transactionId: String(r.transactionId ?? ''),
        })),
      })
    }

    if (focus === 'membership') {
      if (!requireStaffRole(staff, ['membership', 'secretary', 'admin', 'treasurer'])) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const found = await client.items
        .query('Payments')
        .descending('paymentDate')
        .limit(300)
        .find()
        .catch(() => ({ items: [] }))
      let rows = ((found.items ?? []) as Record<string, unknown>[]).filter((r) => {
        const src = String(r.source ?? '').toLowerCase()
        const name = String(r.programName ?? '').toLowerCase()
        return src.includes('membership') || name.includes('membership')
      })
      rows = rows.filter((r) => inRange(String(r.paymentDate ?? ''), from, to))
      return NextResponse.json({
        focus,
        columns: [
          'programName',
          'parentEmail',
          'amount',
          'status',
          'paymentDate',
          'transactionId',
        ],
        rows: rows.map((r) => ({
          id: String(r._id ?? ''),
          programName: String(r.programName ?? ''),
          parentEmail: String(r.parentEmail ?? ''),
          amount: Number(r.amount ?? 0) || 0,
          status: String(r.status ?? ''),
          paymentDate: String(r.paymentDate ?? ''),
          transactionId: String(r.transactionId ?? ''),
        })),
      })
    }

    // events
    if (!requireStaffRole(staff, ['events', 'secretary', 'marketing', 'admin', 'treasurer'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const found = await client.items
      .query('EventTicketOrders')
      .descending('purchasedAt')
      .limit(300)
      .find()
      .catch(() => ({ items: [] }))
    let rows = (found.items ?? []) as Record<string, unknown>[]
    rows = rows.filter((r) => inRange(String(r.purchasedAt ?? ''), from, to))
    return NextResponse.json({
      focus,
      columns: [
        'eventTitle',
        'parentEmail',
        'quantity',
        'amount',
        'status',
        'purchasedAt',
        'transactionId',
      ],
      rows: rows.map((r) => ({
        id: String(r._id ?? ''),
        eventTitle: String(r.eventTitle ?? ''),
        parentEmail: String(r.parentEmail ?? ''),
        quantity: Number(r.quantity ?? 0) || 0,
        amount: Number(r.amount ?? 0) || 0,
        status: String(r.status ?? ''),
        purchasedAt: String(r.purchasedAt ?? ''),
        transactionId: String(r.transactionId ?? ''),
      })),
    })
  } catch (err) {
    console.error('/api/staff/reports', err)
    return NextResponse.json({ error: 'Could not load report' }, { status: 500 })
  }
}
