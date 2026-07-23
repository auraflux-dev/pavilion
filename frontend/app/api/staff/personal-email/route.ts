import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession } from '@/lib/staff/session'
import {
  isStaffEmail,
  isValidPersonalEmail,
  normalizePersonalEmail,
} from '@/lib/staff/roles'

/**
 * Board members save their personal (parent portal) email on StaffRoles.
 * Staff login stays @shmspto.org; parent login uses this personal address.
 */
export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }
  return NextResponse.json({
    staffEmail: session.email,
    personalEmail: session.staff.personalEmail || '',
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const personalEmail = normalizePersonalEmail(String(body.personalEmail ?? ''))

    if (personalEmail && !isValidPersonalEmail(personalEmail)) {
      return NextResponse.json(
        {
          error: isStaffEmail(personalEmail)
            ? 'Use your personal email for the parent portal, not @shmspto.org.'
            : 'Enter a valid personal email address.',
        },
        { status: 400 },
      )
    }

    const client = getWixClient()

    if (personalEmail) {
      const clash = await client.items
        .query('StaffRoles')
        .eq('personalEmail', personalEmail)
        .limit(5)
        .find()
      const taken = (clash.items ?? []).some((row) => {
        const email = String((row as { email?: string }).email ?? '').toLowerCase()
        return email && email !== session.email
      })
      if (taken) {
        return NextResponse.json(
          { error: 'That personal email is already linked to another staff account.' },
          { status: 409 },
        )
      }
    }

    const existing = await client.items
      .query('StaffRoles')
      .eq('email', session.email)
      .limit(1)
      .find()
    const row = existing.items?.[0] as { _id?: string } | undefined
    if (!row?._id) {
      return NextResponse.json({ error: 'StaffRoles row not found' }, { status: 404 })
    }

    await client.items.update('StaffRoles', {
      ...row,
      _id: row._id,
      personalEmail,
    } as Parameters<typeof client.items.update>[1])

    return NextResponse.json({ ok: true, personalEmail })
  } catch (err) {
    console.error('/api/staff/personal-email PATCH', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Could not save personal email. Ask admin to add a Text field “personalEmail” on StaffRoles.',
      },
      { status: 500 },
    )
  }
}
