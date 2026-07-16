/**
 * PATCH /api/auth/profile — update logged-in parent name & phone (in-portal, no Wix redirect).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'

export async function PATCH(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const firstName = String(body.firstName ?? '').trim()
    const lastName = String(body.lastName ?? '').trim()
    const phone = String(body.phone ?? '').trim()

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'firstName and lastName are required' }, { status: 400 })
    }

    const { member, oauthClient, memberId } = session
    const existingPhones = member.contact?.phones ?? []

    await oauthClient.members.updateMember(memberId, {
      contact: {
        firstName,
        lastName,
        phones: phone
          ? [{ phone, primary: true }]
          : existingPhones.length
            ? existingPhones
            : undefined,
      },
    } as Parameters<typeof oauthClient.members.updateMember>[1])

    return NextResponse.json({
      member: {
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        phone,
      },
    })
  } catch (err) {
    console.error('/api/auth/profile PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
