import { NextRequest, NextResponse } from 'next/server'
import { appDbEnabled } from '@/lib/crm/db'
import {
  MissingOrganizationIdError,
  organizationFromHostHeader,
  organizationIdFromRequest,
} from '@/lib/crm/tenant'
import { getStaffSession } from '@/lib/staff/session'
import { sendSignupConfirmationEmail } from '@/lib/signups/confirm-email'
import { claimSignupSlots } from '@/lib/signups/registrations'
import { resolvePublishedSignupSheet } from '@/lib/signups/sheets'
import type { ClaimSignupInput } from '@/lib/signups/types'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ slug: string }> }

async function resolveOrg(req: NextRequest): Promise<string | null> {
  try {
    return await organizationIdFromRequest(req)
  } catch (err) {
    if (!(err instanceof MissingOrganizationIdError)) throw err
    const hostRow = await organizationFromHostHeader(req)
    return hostRow?.id ?? null
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  if (!appDbEnabled()) {
    return NextResponse.json({ error: 'Not available' }, { status: 503 })
  }
  const { slug } = await ctx.params
  try {
    const orgId = await resolveOrg(req)
    const sheet = await resolvePublishedSignupSheet(slug, orgId)
    if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = (await req.json()) as ClaimSignupInput
    const requireStaff = sheet.settings.requireStaffIdentity === true
    const session = await getStaffSession(req)
    let claimInput = body
    if (session?.staff) {
      const staffName =
        session.staff.name.trim() ||
        session.staff.boardTitle.trim() ||
        session.staff.email.split('@')[0] ||
        'Board member'
      claimInput = {
        ...body,
        name: staffName,
        email: session.staff.email,
        phone: body.phone || '',
      }
    } else if (requireStaff) {
      return NextResponse.json(
        { error: 'Sign in with your board email to claim a slot' },
        { status: 401 },
      )
    }
    const claimed = await claimSignupSlots(sheet.organizationId, sheet, claimInput)

    const origin = new URL(req.url).origin
    const confirmUrl = `${origin}/signups/${encodeURIComponent(sheet.slug)}/confirm?token=${encodeURIComponent(claimed.confirmationToken)}`
    const mail = await sendSignupConfirmationEmail({
      sheet,
      registrations: claimed.registrations,
      confirmUrl,
    })

    return NextResponse.json({
      ok: true,
      confirmationToken: claimed.confirmationToken,
      confirmPath: `/signups/${sheet.slug}/confirm?token=${claimed.confirmationToken}`,
      registrations: claimed.registrations.map((r) => ({
        id: r.id,
        slotId: r.slotId,
        slotTitle: r.slotTitle,
        quantity: r.quantity,
        participantName: r.participantName,
        participantEmail: r.participantEmail,
      })),
      email: mail,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not complete sign-up'
    console.error('/api/signups/[slug]/claim', err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
