/**
 * GET  /api/portal/guardians. List co-parents for this household
 * POST /api/portal/guardians. Invite { email }
 * DELETE /api/portal/guardians. Revoke { email }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { checkHouseholdInviteEmail } from '@/lib/email-invite'
import { sendMassEmail } from '@/lib/staff/mass-email'
import { getWixClient } from '@/lib/wix-client'
import {
  createGuardianInvite,
  listGuardianRowsForPrimary,
  listStudentsForViewer,
  resolvePrimaryParentEmail,
  revokeGuardianLink,
} from '@/lib/family-guardians'

function siteBase(req: NextRequest) {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .split(',')[0]
    .trim()
  if (host.includes('localhost') || host.startsWith('127.0.0.1')) return `http://${host}`
  if (host.includes('shmspto.org') || host.endsWith('.vercel.app')) return `https://${host}`
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shmspto.org').replace(/\/$/, '')
}

async function notifyPrimaryOfInvite(opts: {
  primaryEmail: string
  guardianEmail: string
  acceptUrl: string
  emailedInvitee: boolean
}) {
  const body = [
    `You invited ${opts.guardianEmail} to share your SHMS PTO family account.`,
    '',
    opts.emailedInvitee
      ? `We emailed them that address. If it was mistyped, they will not get it. Remove them under Share portal access and invite again.`
      : `We did not email ${opts.guardianEmail}. Share the link below instead.`,
    '',
    'Share this link (they must sign in as that email):',
    opts.acceptUrl,
    '',
    'Cove Digital Card stays on your household account unless they buy separately.',
  ].join('\n')

  try {
    await sendMassEmail({
      subject: `You invited ${opts.guardianEmail} to your family portal`,
      body,
      fromName: 'SHMS PTO',
      replyTo: opts.primaryEmail,
      recipients: [opts.primaryEmail],
    })
  } catch (err) {
    console.warn('/api/portal/guardians owner email failed', err)
  }

  try {
    const client = getWixClient()
    await client.items.insert('ParentMessages', {
      parentEmail: opts.primaryEmail,
      audience: 'family',
      grade: null,
      studentId: null,
      studentName: null,
      programName: '',
      fromName: 'SHMS PTO',
      subject: `Invite sent to ${opts.guardianEmail}`,
      body,
      sentAt: new Date().toISOString(),
      active: true,
    })
  } catch (err) {
    console.warn('/api/portal/guardians ParentMessages insert failed', err)
  }
}

export async function GET(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const primary = await resolvePrimaryParentEmail(session.email)
    const isPrimary = primary === session.email.trim().toLowerCase()
    const rows = isPrimary ? await listGuardianRowsForPrimary(primary) : []
    const students = await listStudentsForViewer(session.email)

    return NextResponse.json({
      viewerEmail: session.email.trim().toLowerCase(),
      primaryParentEmail: primary,
      isPrimary,
      guardians: rows
        .filter((r) => r.status !== 'revoked' && r.active !== false)
        .map((r) => ({
          email: String(r.guardianEmail ?? ''),
          status: String(r.status ?? ''),
          invitedAt: r.invitedAt || null,
          acceptedAt: r.acceptedAt || null,
        })),
      studentCount: students.length,
      note:       isPrimary
        ? 'Invite another adult so they get their own login for the same students. Type their email twice so we catch typos. You get a copy of the invite and a share link. Cove Digital Card stays on this account unless they buy separately.'
        : 'You are linked with a shared portal login. Cove membership and family code belong to the primary account holder.',
    })
  } catch (err) {
    console.error('/api/portal/guardians GET', err)
    return NextResponse.json({ error: 'Could not load family links' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const primary = await resolvePrimaryParentEmail(session.email)
    if (primary !== session.email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'Only the primary account holder can invite other adults.' },
        { status: 403 },
      )
    }

    const students = await listStudentsForViewer(session.email)
    if (students.length === 0) {
      return NextResponse.json(
        { error: 'Add a student first, then invite another adult.' },
        { status: 400 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const check = await checkHouseholdInviteEmail({
      email: String(body.email ?? ''),
      confirmEmail: String(body.confirmEmail ?? ''),
      acceptSuggestion: Boolean(body.acceptSuggestion),
    })
    if (!check.ok) {
      return NextResponse.json(
        { error: check.error, suggestion: check.suggestion ?? null },
        { status: 400 },
      )
    }
    const guardianEmail = check.email

    const invitedByName =
      `${session.member?.contact?.firstName ?? ''} ${session.member?.contact?.lastName ?? ''}`.trim() ||
      session.email

    const { token, expiresAt } = await createGuardianInvite({
      primaryParentEmail: primary,
      guardianEmail,
      invitedByName,
    })

    const acceptUrl = `${siteBase(req)}/member-portal/join-family?token=${encodeURIComponent(token)}`
    const kidNames = students
      .map((s) => `${s.firstName || ''} ${s.lastName || ''}`.trim())
      .filter(Boolean)
      .slice(0, 5)
      .join(', ')

    const mail = await sendMassEmail({
      subject: 'You’re invited to the SHMS PTO family portal',
      body: [
        `You’ve been invited to share a Stone Hill Middle School PTO family account${
          kidNames ? ` for: ${kidNames}` : ''
        }.`,
        '',
        `Accept invite (sign in or create an account as ${guardianEmail}):`,
        acceptUrl,
        '',
        'You’ll see the same students. Cove Digital Card stays with the primary household account unless you purchase separately.',
        `Link expires ${new Date(expiresAt).toLocaleDateString()}.`,
      ].join('\n'),
      fromName: 'SHMS PTO',
      replyTo: primary,
      recipients: [guardianEmail],
    })

    await notifyPrimaryOfInvite({
      primaryEmail: primary,
      guardianEmail,
      acceptUrl,
      emailedInvitee: Boolean(mail?.ok),
    })

    return NextResponse.json({
      ok: true,
      guardianEmail,
      expiresAt,
      emailed: Boolean(mail?.ok),
      acceptUrl,
      message: mail?.ok
        ? `Invite sent to ${guardianEmail}. We also emailed you a copy with the share link.`
        : `Invite created. Copy and share this link. We emailed you a copy too.`,
    })
  } catch (err) {
    console.error('/api/portal/guardians POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not send invite' },
      { status: 400 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const primary = await resolvePrimaryParentEmail(session.email)
    if (primary !== session.email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'Only the primary account holder can remove shared portal access.' },
        { status: 403 },
      )
    }
    const body = await req.json().catch(() => ({}))
    const guardianEmail = String(body.email ?? '').trim().toLowerCase()
    if (!guardianEmail) return NextResponse.json({ error: 'email required' }, { status: 400 })
    await revokeGuardianLink({ primaryParentEmail: primary, guardianEmail })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/portal/guardians DELETE', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not remove' },
      { status: 500 },
    )
  }
}
