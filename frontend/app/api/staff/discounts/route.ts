/**
 * GET  /api/staff/discounts. list codes
 * POST /api/staff/discounts. create named code OR issue to member
 * PATCH /api/staff/discounts. activate/deactivate
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  createDiscountCode,
  issueDiscountToMember,
  listDiscountCodes,
  setDiscountActive,
} from '@/lib/staff/discounts'

export const dynamic = 'force-dynamic'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['retail', 'membership', 'admin'])) {
    return null
  }
  return session
}

export async function GET(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const codes = await listDiscountCodes()
    return NextResponse.json({ codes })
  } catch (err) {
    console.error('discounts GET', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to list discounts (create DiscountCodes CMS collection if missing)',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    if (body.action === 'issue') {
      const created = await issueDiscountToMember({
        baseName: String(body.baseName ?? body.name ?? 'PTO'),
        parentEmail: String(body.parentEmail ?? ''),
        percentOverride:
          body.percent != null && body.percent !== '' ? Number(body.percent) : null,
        note: String(body.note ?? ''),
      })
      return NextResponse.json({ ok: true, code: created })
    }

    const created = await createDiscountCode({
      code: String(body.code ?? ''),
      name: String(body.name ?? ''),
      percent: Number(body.percent),
      issuedToEmail: body.issuedToEmail ? String(body.issuedToEmail) : '',
      usageLimit: body.usageLimit != null ? Number(body.usageLimit) : 0,
      note: String(body.note ?? ''),
      expirationDays: body.expirationDays != null ? Number(body.expirationDays) : 0,
    })
    return NextResponse.json({ ok: true, code: created })
  } catch (err) {
    console.error('discounts POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create discount' },
      { status: 400 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const id = String(body.id ?? '')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await setDiscountActive(id, Boolean(body.active))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('discounts PATCH', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update' },
      { status: 400 }
    )
  }
}
