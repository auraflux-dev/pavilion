/**
 * POST /api/students. create a student record linked to the logged-in parent
 * GET  /api/students. return all students for the logged-in parent
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getEffectiveParentEmail } from '@/lib/staff/session'

export async function GET(req: NextRequest) {
  const effective = await getEffectiveParentEmail(req)
  if (!effective) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = effective.parentEmail

  try {
    const { listStudentsForViewer } = await import('@/lib/family-guardians')
    const rows = await listStudentsForViewer(email)

    const students = rows.map((item: any) => ({
      id: item._id,
      firstName: item.firstName ?? '',
      lastName: item.lastName ?? '',
      grade: item.grade ?? '',
      membershipTier: item.membershipTier ?? 'free',
      membershipStatus: item.membershipStatus ?? 'active',
      discountCode: item.discountCode ?? null,
      storeCardBalance: item.storeCardBalance ?? 0,
      parentPhone: item.parentPhone ?? '',
      secondaryPhone: item.secondaryPhone ?? '',
      emergencyContact: item.emergencyContact ?? '',
      emergencyPhone: item.emergencyPhone ?? '',
      allergies: item.allergies ?? '',
      medicalConditions: item.medicalConditions ?? '',
      medications: item.medications ?? '',
      pickupAuthorized: item.pickupAuthorized ?? '',
      selfRelease: Boolean(item.selfRelease),
      photoMediaConsent:
        item.photoMediaConsent === true
          ? true
          : item.photoMediaConsent === false
            ? false
            : null,
      primaryParentEmail: item.parentEmail ?? email,
      parentFirstName: item.parentFirstName ?? '',
      parentLastName: item.parentLastName ?? '',
      familyProfileConfirmedAt: item.familyProfileConfirmedAt ?? '',
    }))

    return NextResponse.json({
      students,
      actingAs: effective.actingAs,
      actorEmail: effective.actorEmail,
      parentEmail: effective.parentEmail,
    })
  } catch (err) {
    console.error('/api/students GET error:', err)
    return NextResponse.json({ error: 'Failed to load students' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Must match GET: staff with personalEmail linked save into that household,
  // not the @shmspto.org login (otherwise adds never appear in My Students).
  const effective = await getEffectiveParentEmail(req)
  if (!effective) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { resolvePrimaryParentEmail } = await import('@/lib/family-guardians')
    const primaryEmail = await resolvePrimaryParentEmail(effective.parentEmail)
    if (!primaryEmail) {
      return NextResponse.json({ error: 'No email on account' }, { status: 400 })
    }

    const member = effective.session.member as {
      contact?: { firstName?: string; lastName?: string }
    } | null

    const body = await req.json()
    const { firstName, lastName, grade } = body
    if (!firstName?.trim() || !lastName?.trim() || !grade?.trim()) {
      return NextResponse.json({ error: 'firstName, lastName, and grade are required' }, { status: 400 })
    }

    const adminClient = getWixClient()
    const result = await adminClient.items.insert('Students', {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      grade: grade.trim(),
      parentEmail: primaryEmail,
      parentFirstName: member?.contact?.firstName ?? '',
      parentLastName: member?.contact?.lastName ?? '',
      membershipTier: 'free',
      membershipStatus: 'active',
      storeCardBalance: 0,
      discountCode: null,
      jumbulaSid: '',
      allergies: String(body.allergies ?? '').trim(),
      emergencyContact: String(body.emergencyContact ?? '').trim(),
      emergencyPhone: String(body.emergencyPhone ?? '').trim(),
      parentPhone: String(body.parentPhone ?? '').trim(),
      secondaryPhone: String(body.secondaryPhone ?? '').trim(),
      medicalConditions: String(body.medicalConditions ?? '').trim(),
      medications: String(body.medications ?? '').trim(),
      pickupAuthorized: String(body.pickupAuthorized ?? '').trim(),
      selfRelease: Boolean(body.selfRelease),
      photoMediaConsent:
        body.photoMediaConsent === true
          ? true
          : body.photoMediaConsent === false
            ? false
            : null,
    })

    const inserted = result as {
      _id?: string
      id?: string
      dataItem?: { id?: string; data?: { _id?: string } }
    }
    const studentId = String(
      inserted._id ??
        inserted.id ??
        inserted.dataItem?.id ??
        inserted.dataItem?.data?._id ??
        '',
    )
    if (!studentId) {
      console.error('/api/students POST: insert returned no id', result)
      return NextResponse.json({ error: 'Student created but id missing' }, { status: 500 })
    }

    return NextResponse.json({
      student: {
        id: studentId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        grade: grade.trim(),
        membershipTier: 'free',
        membershipStatus: 'active',
        discountCode: null,
        storeCardBalance: 0,
        parentPhone: String(body.parentPhone ?? '').trim(),
        secondaryPhone: String(body.secondaryPhone ?? '').trim(),
        emergencyContact: String(body.emergencyContact ?? '').trim(),
        emergencyPhone: String(body.emergencyPhone ?? '').trim(),
        allergies: String(body.allergies ?? '').trim(),
        medicalConditions: String(body.medicalConditions ?? '').trim(),
        medications: String(body.medications ?? '').trim(),
        pickupAuthorized: String(body.pickupAuthorized ?? '').trim(),
        selfRelease: Boolean(body.selfRelease),
        photoMediaConsent:
          body.photoMediaConsent === true
            ? true
            : body.photoMediaConsent === false
              ? false
              : null,
      },
    })
  } catch (err) {
    console.error('/api/students POST error:', err)
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
  }
}
