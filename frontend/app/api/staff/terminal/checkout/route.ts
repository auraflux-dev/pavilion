/**
 * POST /api/staff/terminal/checkout. Start Terminal checkout for cart lines
 * GET  /api/staff/terminal/checkout?id=. Poll status; fulfill inventory when COMPLETED
 * POST { action: 'cancel', checkoutId }. Cancel open checkout
 */
import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { lookupFamilyByCoveCode } from '@/lib/cove-family-code'
import {
  cancelTerminalCheckout,
  createTerminalCheckout,
  getTerminalCheckout,
} from '@/lib/square-terminal'
import {
  decrementPricedInventory,
  priceRegisterCart,
  registerLineSummary,
  type RegisterLineIn,
} from '@/lib/staff/cove-register-sale'
import {
  findPendingTerminalSale,
  getSavedTerminalDeviceId,
  insertPendingTerminalSale,
  markTerminalSaleCancelled,
  markTerminalSalePaid,
} from '@/lib/staff/terminal-sales'
import {
  buildInviteSmsText,
  buildJoinUrl,
  findOrCreateFreeMember,
  sendStaffInviteEmail,
  sendWixSetPasswordEmail,
  siteOriginFromRequest,
} from '@/lib/staff/invite-free-parent'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

export const dynamic = 'force-dynamic'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['retail', 'admin'])) return null
  return session
}

async function fulfillIfCompleted(
  req: NextRequest,
  checkoutId: string,
): Promise<NextResponse> {
  const checkout = await getTerminalCheckout(checkoutId)
  if (!checkout) {
    return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
  }

  const pending = await findPendingTerminalSale(checkoutId)
  if (!pending) {
    return NextResponse.json({
      ok: true,
      checkout,
      fulfilled: false,
      message: 'No pending sale for this checkout',
    })
  }

  if (pending.status === 'Paid') {
    return NextResponse.json({
      ok: true,
      checkout,
      fulfilled: true,
      alreadyProcessed: true,
      total: pending.sale.totalDollars,
    })
  }

  if (checkout.status === 'CANCELED' || checkout.status === 'CANCEL_REQUESTED') {
    if (pending.status !== 'Cancelled') {
      await markTerminalSaleCancelled(pending.paymentId, checkoutId)
    }
    return NextResponse.json({ ok: true, checkout, fulfilled: false, cancelled: true })
  }

  if (checkout.status !== 'COMPLETED') {
    return NextResponse.json({
      ok: true,
      checkout,
      fulfilled: false,
      pending: true,
    })
  }

  // Payment succeeded on Terminal. Inventory + ledger
  const { priced } = await priceRegisterCart(pending.sale.lines)
  await decrementPricedInventory(priced)
  const lineSummary = registerLineSummary(priced)
  await markTerminalSalePaid({
    paymentId: pending.paymentId,
    checkoutId,
    paymentIds: checkout.paymentIds,
    lineSummary,
  })

  let invite: { emailed?: boolean; joinUrl?: string; smsText?: string; error?: string } | null =
    null
  const guestEmail = pending.sale.guestEmail || ''
  if (pending.sale.sendJoinInvite && guestEmail.includes('@')) {
    try {
      const origin = siteOriginFromRequest(req)
      const joinUrl = buildJoinUrl(origin)
      const loginJoinUrl = buildJoinUrl(origin, { login: true })
      const nameParts = String(pending.sale.guestName || '')
        .split(/\s+/)
        .filter(Boolean)
      const member = await findOrCreateFreeMember({
        email: guestEmail,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
      })
      const redirectUri = `${origin}/auth/join?mode=login&returnTo=${encodeURIComponent('/member-portal')}`
      await sendWixSetPasswordEmail(guestEmail, redirectUri)
      const mail = await sendStaffInviteEmail({
        email: guestEmail,
        firstName: nameParts[0] || '',
        joinUrl: member.alreadyMember ? loginJoinUrl : joinUrl,
        alreadyMember: member.alreadyMember,
        created: member.created,
      })
      invite = {
        emailed: mail.ok,
        joinUrl: member.alreadyMember ? loginJoinUrl : joinUrl,
        smsText: buildInviteSmsText(joinUrl),
        error: mail.ok ? undefined : mail.error,
      }
    } catch (err) {
      invite = { error: err instanceof Error ? err.message : 'Invite failed' }
    }
  }

  return NextResponse.json({
    ok: true,
    checkout,
    fulfilled: true,
    total: pending.sale.totalDollars,
    lines: priced,
    invite,
  })
}

export async function GET(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const checkoutId = req.nextUrl.searchParams.get('id')?.trim()
  if (!checkoutId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }
  try {
    return await fulfillIfCompleted(req, checkoutId)
  } catch (err) {
    console.error('terminal checkout GET', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load checkout' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const action = String(body.action ?? 'create').trim()

    if (action === 'cancel') {
      const checkoutId = String(body.checkoutId ?? '').trim()
      if (!checkoutId) {
        return NextResponse.json({ error: 'checkoutId required' }, { status: 400 })
      }
      const checkout = await cancelTerminalCheckout(checkoutId)
      const pending = await findPendingTerminalSale(checkoutId)
      if (pending && pending.status !== 'Paid') {
        await markTerminalSaleCancelled(pending.paymentId, checkoutId)
      }
      return NextResponse.json({ ok: true, checkout })
    }

    if (action === 'poll') {
      const checkoutId = String(body.checkoutId ?? '').trim()
      if (!checkoutId) {
        return NextResponse.json({ error: 'checkoutId required' }, { status: 400 })
      }
      return await fulfillIfCompleted(req, checkoutId)
    }

    const lines = (Array.isArray(body.lines) ? body.lines : []) as RegisterLineIn[]
    const code = String(body.code ?? '').trim()
    const guestEmail = String(body.guestEmail ?? '')
      .trim()
      .toLowerCase()
    const guestPhone = String(body.guestPhone ?? '').trim()
    const guestName = String(body.guestName ?? '').trim()
    const sendJoinInvite = Boolean(body.sendJoinInvite)
    const deviceId = (await getSavedTerminalDeviceId()) || String(body.deviceId ?? '').trim()
    if (!deviceId) {
      return NextResponse.json(
        {
          error:
            'No Square Terminal paired yet. Create a pairing code and sign the Terminal in first.',
          code: 'TERMINAL_NOT_PAIRED',
        },
        { status: 409 },
      )
    }

    let parentEmail = 'guest@register.local'
    let coveFamilyCode = ''
    let studentId: string | undefined
    if (code) {
      const family = await lookupFamilyByCoveCode(code)
      if (!family) {
        return NextResponse.json({ error: 'Family not found for that code' }, { status: 404 })
      }
      parentEmail = family.parentEmail
      coveFamilyCode = family.coveFamilyCode
      studentId = family.students[0]?.id
    } else if (guestEmail.includes('@')) {
      parentEmail = guestEmail
    }

    const { priced, totalDollars, totalCents } = await priceRegisterCart(lines)
    const idempotencyKey = String(body.idempotencyKey ?? randomUUID()).slice(0, 45)
    const lineSummary = registerLineSummary(priced)

    const checkout = await createTerminalCheckout({
      amountCents: totalCents,
      deviceId,
      idempotencyKey,
      referenceId: `inperson:${parentEmail}`.slice(0, 40),
      note: `In-person ${coveFamilyCode || guestName || 'guest'}: ${lineSummary}`.slice(0, 500),
    })

    await insertPendingTerminalSale({
      checkoutId: checkout.id,
      totalDollars,
      totalCents,
      lines: priced.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        qty: l.qty,
      })),
      code: code || undefined,
      parentEmail,
      coveFamilyCode: coveFamilyCode || undefined,
      studentId,
      guestEmail: guestEmail || undefined,
      guestPhone: guestPhone || undefined,
      guestName: guestName || undefined,
      sendJoinInvite,
    })

    return NextResponse.json({
      ok: true,
      checkout,
      total: totalDollars,
      message: 'Amount sent to Square Terminal. Customer can tap / swipe / dip.',
    })
  } catch (err) {
    console.error('terminal checkout POST', err)
    const message = err instanceof Error ? err.message : 'Terminal checkout failed'
    const status = typeof (err as { status?: number })?.status === 'number'
      ? (err as { status: number }).status
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}
