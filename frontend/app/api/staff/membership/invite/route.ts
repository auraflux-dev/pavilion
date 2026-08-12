/**
 * POST /api/staff/membership/invite
 * In-person: create/find free Wix member + email join / set-password link.
 * Always returns joinUrl + smsText so staff can text from their phone.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  buildInviteSmsText,
  buildJoinUrl,
  findOrCreateFreeMember,
  sendStaffInviteEmail,
  sendWixSetPasswordEmail,
  siteOriginFromRequest,
} from '@/lib/staff/invite-free-parent'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }
  if (
    !requireStaffRole(session.staff, [
      'membership',
      'secretary',
      'admin',
      'retail',
      'events',
    ])
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string
      firstName?: string
      lastName?: string
      phone?: string
      sendEmail?: boolean
    }

    const email = String(body.email || '')
      .trim()
      .toLowerCase()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
    }

    const firstName = String(body.firstName || '').trim()
    const lastName = String(body.lastName || '').trim()
    const phone = String(body.phone || '').trim()
    const sendEmail = body.sendEmail !== false

    const origin = siteOriginFromRequest(req)
    const joinUrl = buildJoinUrl(origin)
    const loginJoinUrl = buildJoinUrl(origin, { login: true })
    const smsText = buildInviteSmsText(joinUrl)

    const member = await findOrCreateFreeMember({ email, firstName, lastName })

    const redirectUri = `${origin}/auth/join?mode=login&returnTo=${encodeURIComponent('/member-portal')}`
    let wixResetSent = false
    let wixResetError: string | undefined
    if (sendEmail) {
      const reset = await sendWixSetPasswordEmail(email, redirectUri)
      wixResetSent = reset.ok
      wixResetError = reset.error
    }

    let gmailSent = false
    let gmailError: string | undefined
    if (sendEmail) {
      const mail = await sendStaffInviteEmail({
        email,
        firstName,
        joinUrl: member.alreadyMember ? loginJoinUrl : joinUrl,
        alreadyMember: member.alreadyMember,
        created: member.created,
      })
      gmailSent = mail.ok
      gmailError = mail.error
    }

    const emailed = wixResetSent || gmailSent
    const parts: string[] = []
    if (member.created) parts.push('Free account created.')
    else if (member.alreadyMember) parts.push('Account already exists.')
    if (wixResetSent) parts.push('Wix set-password email sent.')
    if (gmailSent) parts.push('PTO email sent.')
    if (sendEmail && !emailed) {
      parts.push('Email did not send — copy the link or SMS text below.')
    } else if (!sendEmail) {
      parts.push('Link ready to copy / text.')
    }

    return NextResponse.json({
      ok: true,
      email,
      phone: phone || null,
      memberId: member.memberId,
      created: member.created,
      alreadyMember: member.alreadyMember,
      joinUrl,
      smsText,
      emailed,
      wixResetSent,
      gmailSent,
      errors: [wixResetError, gmailError].filter(Boolean),
      message: parts.join(' '),
    })
  } catch (err) {
    console.error('staff/membership/invite', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invite failed' },
      { status: 500 },
    )
  }
}
