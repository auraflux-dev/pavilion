import { NextRequest, NextResponse } from 'next/server'
import { commonsDbEnabled } from '@/lib/crm/db'
import {
  MissingOrganizationIdError,
  organizationFromHostHeader,
  organizationIdFromRequest,
} from '@/lib/crm/tenant'
import { sendSignupConfirmationEmail } from '@/lib/signups/confirm-email'
import { claimSignupSlots } from '@/lib/signups/registrations'
import { resolvePublishedSignupSheet } from '@/lib/signups/sheets'
import type { ClaimSignupInput } from '@/lib/signups/registrations'

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
  if (!commonsDbEnabled()) {
    return NextResponse.json({ error: 'Not available' }, { status: 503 })
  }
  const { slug } = await ctx.params
  try {
    const orgId = await resolveOrg(req)
    const sheet = await resolvePublishedSignupSheet(slug, orgId)
    if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = (await req.json()) as ClaimSignupInput
    const claimed = await claimSignupSlots(sheet.organizationId, sheet, body)

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
        slotTitle: r.slotTitle,
        quantity: r.quantity,
      })),
      email: mail,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not complete sign-up'
    console.error('/api/signups/[slug]/claim', err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
