/**
 * POST /api/portal/confirm-family
 * First-login confirm/update: parent name + shared safety fields on all kids.
 * Unlocks Cove once every active student has a complete safety profile and parent name.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getWixClient } from '@/lib/wix-client'
import { getEffectiveParentEmail } from '@/lib/staff/session'
import { coveFeaturesUnlocked } from '@/lib/onboarding-checklist'

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const effective = await getEffectiveParentEmail(req)
  if (!effective) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = effective.parentEmail.trim().toLowerCase()

  try {
    const body = await req.json()
    const parentFirstName = String(body.parentFirstName ?? '').trim()
    const parentLastName = String(body.parentLastName ?? '').trim()
    const parentPhone = String(body.parentPhone ?? '').trim()
    const emergencyContact = String(body.emergencyContact ?? '').trim()
    const emergencyPhone = String(body.emergencyPhone ?? '').trim()
    const pickupAuthorized = String(body.pickupAuthorized ?? '').trim()

    if (!parentFirstName || !parentLastName) {
      return NextResponse.json({ error: 'Parent first and last name are required.' }, { status: 400 })
    }
    if (!parentPhone) {
      return NextResponse.json({ error: 'Parent phone is required.' }, { status: 400 })
    }
    if (!emergencyContact || !emergencyPhone) {
      return NextResponse.json(
        { error: 'Emergency contact name and phone are required.' },
        { status: 400 },
      )
    }
    if (!pickupAuthorized) {
      return NextResponse.json(
        { error: 'Add at least one person authorized for pick-up.' },
        { status: 400 },
      )
    }

    // Keep Wix member contact in sync (account Edit profile)
    try {
      await session.oauthClient.members.updateMember(session.memberId, {
        contact: {
          firstName: parentFirstName,
          lastName: parentLastName,
          phones: [{ phone: parentPhone, primary: true }],
        },
      } as unknown as Parameters<typeof session.oauthClient.members.updateMember>[1])
    } catch (err) {
      console.warn('confirm-family: Wix member update failed', err)
    }

    const client = getWixClient()
    const found = await client.items.query('Students').eq('parentEmail', email).limit(100).find()
    const rows = ((found.items ?? []) as Array<Record<string, unknown>>).filter(
      (s) => s.archived !== true,
    )
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Add a student first, then confirm family details.' },
        { status: 400 },
      )
    }

    const confirmedAt = new Date().toISOString()
    const updatedStudents = []
    for (const row of rows) {
      const next = {
        ...row,
        _id: String(row._id),
        parentFirstName,
        parentLastName,
        parentPhone,
        emergencyContact,
        emergencyPhone,
        pickupAuthorized,
        familyProfileConfirmedAt: confirmedAt,
      }
      await client.items.update(
        'Students',
        next as Parameters<typeof client.items.update>[1],
      )
      updatedStudents.push({
        id: String(row._id ?? ''),
        firstName: String(row.firstName ?? ''),
        lastName: String(row.lastName ?? ''),
        grade: String(row.grade ?? ''),
        membershipTier: String(row.membershipTier ?? 'free'),
        membershipStatus: String(row.membershipStatus ?? 'active'),
        discountCode: (row.discountCode as string | null) ?? null,
        storeCardBalance: Number(row.storeCardBalance ?? 0) || 0,
        parentPhone,
        emergencyContact,
        emergencyPhone,
        pickupAuthorized,
        parentFirstName,
        parentLastName,
        familyProfileConfirmedAt: confirmedAt,
      })
    }

    // Parent-level confirmation marker for staff / future gates
    try {
      const mem = await client.items.query('Memberships').eq('email', email).limit(1).find()
      const existing = mem.items?.[0] as Record<string, unknown> | undefined
      if (existing?._id) {
        await client.items.update('Memberships', {
          ...existing,
          _id: String(existing._id),
          familyProfileConfirmedAt: confirmedAt,
        } as Parameters<typeof client.items.update>[1])
      } else {
        await client.items.insert('Memberships', {
          email,
          tier: 'free',
          status: 'active',
          familyProfileConfirmedAt: confirmedAt,
        })
      }
    } catch (err) {
      console.warn('confirm-family: Memberships confirm stamp failed', err)
    }

    const gate = coveFeaturesUnlocked(updatedStudents)
    return NextResponse.json({
      ok: true,
      students: updatedStudents,
      coveUnlocked: gate.ok,
      member: {
        name: `${parentFirstName} ${parentLastName}`.trim(),
        firstName: parentFirstName,
        lastName: parentLastName,
        phone: parentPhone,
      },
    })
  } catch (err) {
    console.error('/api/portal/confirm-family POST error:', err)
    return NextResponse.json({ error: 'Could not save family details.' }, { status: 500 })
  }
}
