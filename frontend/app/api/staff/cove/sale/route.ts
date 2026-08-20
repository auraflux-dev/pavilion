/**
 * POST /api/staff/cove/sale
 * Cash, Stand backup, or external (Zelle / PayPal / phone Square). inventory + ledger.
 *
 * Body: {
 *   tender: 'cash' | 'stand' | 'zelle' | 'paypal' | 'phone_square' | 'other',
 *   lines?: [{ productId, variantId?, qty }],
 *   amount?: number,  // external when no lines
 *   code?: string,
 *   guestEmail?, guestPhone?, guestName?, note?,
 *   sendJoinInvite?: boolean,
 *   idempotencyKey?: string,
 * }
 */
import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { lookupFamilyByCoveCode } from '@/lib/cove-family-code'
import {
  decrementPricedInventory,
  priceRegisterCart,
  registerLineSummary,
  type RegisterLineIn,
} from '@/lib/staff/cove-register-sale'
import {
  buildInviteSmsText,
  buildJoinUrl,
  findOrCreateFreeMember,
  sendStaffInviteEmail,
  sendWixSetPasswordEmail,
  siteOriginFromRequest,
} from '@/lib/staff/invite-free-parent'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { getWixClient } from '@/lib/wix-client'

export const dynamic = 'force-dynamic'

const EXTERNAL_TENDERS = new Set(['zelle', 'paypal', 'phone_square', 'other'])
const ALL_TENDERS = new Set(['cash', 'stand', ...EXTERNAL_TENDERS])

function tenderLabel(tender: string) {
  switch (tender) {
    case 'cash':
      return 'Cash'
    case 'stand':
      return 'Square Stand'
    case 'zelle':
      return 'Zelle'
    case 'paypal':
      return 'PayPal'
    case 'phone_square':
      return 'Phone Square'
    default:
      return 'Other external'
  }
}

function tenderSource(tender: string) {
  if (tender === 'stand') return 'cove_register_stand'
  if (tender === 'cash') return 'cove_register_cash'
  return `cove_register_${tender}`
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['retail', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const tender = String(body.tender ?? '').trim().toLowerCase()
    if (!ALL_TENDERS.has(tender)) {
      return NextResponse.json(
        { error: 'tender must be cash, stand, zelle, paypal, phone_square, or other' },
        { status: 400 },
      )
    }

    const lines = (Array.isArray(body.lines) ? body.lines : []) as RegisterLineIn[]
    const code = String(body.code ?? '').trim()
    const guestEmail = String(body.guestEmail ?? '')
      .trim()
      .toLowerCase()
    const guestPhone = String(body.guestPhone ?? '').trim()
    const guestName = String(body.guestName ?? '').trim()
    const staffNote = String(body.note ?? '').trim()
    const sendJoinInvite = Boolean(body.sendJoinInvite)
    const idempotencyKey = String(body.idempotencyKey ?? randomUUID()).slice(0, 45)
    const isExternal = EXTERNAL_TENDERS.has(tender)

    let parentEmail = ''
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
    } else {
      parentEmail = 'guest@register.local'
    }

    const source = tenderSource(tender)
    const client = getWixClient()
    const priorSale = await client.items
      .query('Payments')
      .eq('transactionId', idempotencyKey)
      .eq('source', source)
      .limit(1)
      .find()
    if ((priorSale.items ?? []).length > 0) {
      const prior = priorSale.items[0] as { amount?: number }
      return NextResponse.json({
        ok: true,
        total: Number(prior.amount) || 0,
        alreadyProcessed: true,
        parentEmail,
        coveFamilyCode: coveFamilyCode || null,
        tender,
      })
    }

    let priced: Awaited<ReturnType<typeof priceRegisterCart>>['priced'] = []
    let totalDollars = 0
    let lineSummary = ''

    if (lines.length > 0) {
      const cart = await priceRegisterCart(lines)
      priced = cart.priced
      totalDollars = cart.totalDollars
      lineSummary = registerLineSummary(priced)
      await decrementPricedInventory(priced)
    } else if (isExternal) {
      totalDollars = Math.round(Number(body.amount) * 100) / 100
      if (!Number.isFinite(totalDollars) || totalDollars <= 0) {
        return NextResponse.json(
          { error: 'Enter an amount (or add product lines)' },
          { status: 400 },
        )
      }
      lineSummary = staffNote || 'External / no itemized cart'
    } else {
      return NextResponse.json({ error: 'Add at least one product' }, { status: 400 })
    }

    const who = code
      ? `Code ${coveFamilyCode || code}`
      : guestName || guestEmail || guestPhone || 'Guest'
    const contactBits = [guestEmail, guestPhone].filter(Boolean).join(' · ')
    const methodNote = isExternal
      ? `${tenderLabel(tender)} (logged by staff)`
      : tender === 'stand'
        ? 'Paid on Square Stand / reader (tap·swipe·dip)'
        : 'Cash at table'
    const notes = [
      `${who}: ${lineSummary}`,
      contactBits ? `Contact ${contactBits}` : '',
      methodNote,
      staffNote && lines.length ? `Note: ${staffNote}` : '',
    ]
      .filter(Boolean)
      .join(' · ')

    try {
      await client.items.insert('Payments', {
        parentEmail,
        studentId: studentId || undefined,
        amount: totalDollars,
        status: 'Paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: tenderLabel(tender),
        transactionId: idempotencyKey,
        source,
        programName: isExternal ? 'In-person sales (external)' : 'In-person sales',
        notes,
      })
    } catch (err) {
      console.warn('In-person tender Payments insert failed:', err)
    }

    let invite: {
      joinUrl?: string
      smsText?: string
      emailed?: boolean
      error?: string
    } | null = null

    if (sendJoinInvite && guestEmail.includes('@')) {
      try {
        const origin = siteOriginFromRequest(req)
        const joinUrl = buildJoinUrl(origin)
        const loginJoinUrl = buildJoinUrl(origin, { login: true })
        const smsText = buildInviteSmsText(joinUrl)
        const nameParts = guestName.split(/\s+/).filter(Boolean)
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
          joinUrl: member.alreadyMember ? loginJoinUrl : joinUrl,
          smsText: guestPhone ? buildInviteSmsText(joinUrl) : smsText,
          emailed: mail.ok,
          error: mail.ok ? undefined : mail.error,
        }
      } catch (err) {
        invite = {
          error: err instanceof Error ? err.message : 'Invite failed',
        }
      }
    }

    return NextResponse.json({
      ok: true,
      total: totalDollars,
      tender,
      lines: priced,
      parentEmail,
      coveFamilyCode: coveFamilyCode || null,
      paymentId: idempotencyKey,
      invite,
    })
  } catch (err) {
    const status =
      typeof (err as { status?: number })?.status === 'number'
        ? (err as { status: number }).status
        : 500
    console.error('cove sale', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sale failed' },
      { status },
    )
  }
}
