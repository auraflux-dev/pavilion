/**
 * GET  /api/portal/guardians/accept?token= — preview invite
 * POST /api/portal/guardians/accept { token } — accept while signed in
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { acceptGuardianInvite, findInviteByToken } from '@/lib/family-guardians'

export async function GET(req: NextRequest) {
  const token = String(req.nextUrl.searchParams.get('token') ?? '').trim()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  try {
    const row = await findInviteByToken(token)
    if (!row) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    if (row.status === 'revoked') return NextResponse.json({ error: 'Invite revoked' }, { status: 410 })
    if (row.inviteExpiresAt && new Date(row.inviteExpiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
    }
    return NextResponse.json({
      status: row.status,
      guardianEmail: row.guardianEmail,
      primaryParentEmail: row.primaryParentEmail,
      invitedByName: row.invitedByName || '',
      expiresAt: row.inviteExpiresAt || null,
    })
  } catch (err) {
    console.error('/api/portal/guardians/accept GET', err)
    return NextResponse.json({ error: 'Could not load invite' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to accept this invite.', code: 'AUTH' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const token = String(body.token ?? '').trim()
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const result = await acceptGuardianInvite({
      token,
      acceptingEmail: session.email,
    })
    return NextResponse.json({
      ok: true,
      primaryParentEmail: result.primaryParentEmail,
      message: 'You’re linked. Open Member Portal to see shared students.',
    })
  } catch (err) {
    console.error('/api/portal/guardians/accept POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not accept invite' },
      { status: 400 },
    )
  }
}
