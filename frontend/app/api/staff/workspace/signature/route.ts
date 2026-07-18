import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession } from '@/lib/staff/session'

/** Load / save the signed-in staffer's portal email signature (StaffRoles.emailSignature). */
export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }
  return NextResponse.json({
    email: session.email,
    signature: session.staff.emailSignature || '',
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const signature = String(body.signature ?? '').slice(0, 2000)

    const client = getWixClient()
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
      emailSignature: signature,
    } as Parameters<typeof client.items.update>[1])

    return NextResponse.json({ ok: true, signature })
  } catch (err) {
    console.error('/api/staff/workspace/signature PATCH', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Could not save signature. Add a Text field “emailSignature” on the StaffRoles CMS collection.',
      },
      { status: 500 },
    )
  }
}
