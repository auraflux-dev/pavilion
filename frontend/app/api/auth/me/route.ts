/**
 * GET /api/auth/me
 * Returns the current member's profile + free/paid membership summary.
 */
import { NextRequest, NextResponse } from 'next/server'
import { ACT_AS_COOKIE, TOKENS_COOKIE, isSecure } from '@/lib/auth-cookies'
import { isMemberTokens, parseTokensCookie } from '@/lib/auth'
import { getMemberSession } from '@/lib/auth-member'
import { pickSessionEmail } from '@/lib/member-emails'
import { getEffectiveParentEmail } from '@/lib/staff/session'
import { resolveStaffForSession } from '@/lib/staff/roles'
import { isDemoInstance } from '@/lib/demo/instance'
import {
  demoMemberId,
  demoStaffProfile,
  getDemoReviewSession,
} from '@/lib/demo/session'
import { demoReviewerStudents } from '@/lib/demo/seed'
import { tryGetWixClient } from '@/lib/wix-admin-client'

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function visitorResponse(req: NextRequest) {
  const tokens = parseTokensCookie(req.cookies.get(TOKENS_COOKIE)?.value)
  const res = noStoreJson({ status: 'visitor', member: null })
  if (tokens && isMemberTokens(tokens)) {
    res.cookies.set(TOKENS_COOKIE, '', {
      httpOnly: true,
      secure: isSecure(),
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    res.cookies.set(ACT_AS_COOKIE, '', {
      httpOnly: true,
      secure: isSecure(),
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
  }
  return res
}

export async function GET(req: NextRequest) {
  try {
    if (isDemoInstance()) {
      const demo = getDemoReviewSession(req)
      if (demo) {
        const staff = demo.lane === 'parent' ? null : demoStaffProfile(demo)
        const name = `${demo.firstName} ${demo.lastName}`.trim()
        const paid = demo.parentKind !== 'free'
        const students = demoReviewerStudents(demo)
        return noStoreJson({
          member: {
            id: demoMemberId(demo.email),
            name,
            firstName: demo.firstName,
            lastName: demo.lastName,
            needsName: false,
            email: demo.email,
            profileImage: null,
            memberSince: new Date(demo.iat || Date.parse('2025-09-08T12:00:00.000Z')).toISOString(),
          },
          storeCards: paid
            ? [{ balance: 42.5, studentName: students[0]?.name }]
            : [{ balance: 0, studentName: students[0]?.name }],
          membership: paid
            ? { tier: 'lagoon', expiresAt: '', status: 'active' }
            : { tier: 'free', expiresAt: '', status: 'none' },
          students,
          studentCount: students.length,
          hasPaidMembership: paid,
          accountType: paid ? 'paid' : 'free',
          actingAs: false,
          linkedHousehold: false,
          viewingEmail: demo.email,
          staffRoles: staff?.roles ?? [],
          boardTitle: staff?.boardTitle ?? '',
          staffName: staff?.name ?? '',
          personalEmail: demo.email,
          needsPersonalEmail: false,
          isStaff: Boolean(staff),
          demo: true,
        })
      }
    }

    const session = await getMemberSession(req)
    if (!session) {
      return visitorResponse(req)
    }

    const { member, email: actorEmail, emails: memberEmails } = session
    const effective = await getEffectiveParentEmail(req)
    const email = effective?.parentEmail ?? actorEmail
    const actingAs = Boolean(effective?.actingAs)
    const linkedHousehold = Boolean(effective?.linkedHousehold)
    const staff =
      effective?.staff ?? (await resolveStaffForSession(actorEmail, memberEmails))
    const adminClient = tryGetWixClient()

    let storeCards: { balance: number; studentName: string }[] = []
    if (adminClient) {
      try {
        const cardsResult = await adminClient.items
          .query('StoreCards')
          .eq('parentEmail', email)
          .find()
        storeCards = (cardsResult.items ?? []).map((item) => ({
          balance: (item as { balance?: number }).balance ?? 0,
          studentName: (item as { studentName?: string }).studentName ?? '',
        }))
      } catch {
        // optional collection
      }
    }

    let membership: { tier: string; expiresAt: string; status?: string } | null = null
    if (adminClient) {
      try {
        const membershipResult = await adminClient.items
          .query('Memberships')
          .eq('email', email)
          .find()
        const m = membershipResult.items?.[0] as
          | { tier?: string; expiresAt?: string; status?: string }
          | undefined
        if (m?.tier) {
          membership = {
            tier: m.tier,
            expiresAt: m.expiresAt ?? '',
            status: m.status,
          }
        }
      } catch {
        // optional
      }
    }

    let students: {
      id: string
      firstName: string
      lastName: string
      grade: string
      membershipTier: string
      membershipStatus: string
    }[] = []
    try {
      const { listStudentsForViewer, resolvePrimaryParentEmail } = await import(
        '@/lib/family-guardians'
      )
      const householdEmail = await resolvePrimaryParentEmail(email)
      if (adminClient && householdEmail !== email) {
        try {
          const membershipResult = await adminClient.items
            .query('Memberships')
            .eq('email', householdEmail)
            .find()
          const hm = membershipResult.items?.[0] as
            | { tier?: string; expiresAt?: string; status?: string }
            | undefined
          if (hm?.tier && !membership) {
            membership = {
              tier: hm.tier,
              expiresAt: hm.expiresAt ?? '',
              status: hm.status,
            }
          }
        } catch {
          // ignore
        }
      }
      const rows = await listStudentsForViewer(email)
      students = rows.map((item) => {
        const s = item as {
          _id?: string
          firstName?: string
          lastName?: string
          grade?: string
          membershipTier?: string
          membershipStatus?: string
        }
        return {
          id: s._id ?? '',
          firstName: s.firstName ?? '',
          lastName: s.lastName ?? '',
          grade: s.grade ?? '',
          membershipTier: s.membershipTier ?? 'free',
          membershipStatus: s.membershipStatus ?? 'active',
        }
      })
    } catch {
      // optional
    }

    const paidFromStudents = students.some(
      (s) => s.membershipTier && s.membershipTier !== 'free',
    )
    const paidFromMemberships =
      !!membership?.tier &&
      membership.tier !== 'free' &&
      membership.status !== 'expired'
    const hasPaidMembership = paidFromStudents || paidFromMemberships
    const accountType: 'free' | 'paid' = hasPaidMembership ? 'paid' : 'free'

    const firstName = String(member.contact?.firstName ?? '').trim()
    const lastName = String(member.contact?.lastName ?? '').trim()
    const name = `${firstName} ${lastName}`.trim() || pickSessionEmail(memberEmails)

    return noStoreJson({
      member: {
        id: member._id,
        name,
        firstName,
        lastName,
        needsName: !firstName || !lastName,
        email: actorEmail,
        profileImage: member.profile?.photo?.url ?? null,
        memberSince: member._createdDate ?? null,
      },
      storeCards,
      membership,
      students,
      studentCount: students.length,
      hasPaidMembership,
      accountType,
      actingAs,
      linkedHousehold,
      viewingEmail: email,
      staffRoles: staff?.roles ?? [],
      boardTitle: staff?.boardTitle ?? '',
      staffName: staff?.name ?? '',
      personalEmail: staff?.personalEmail ?? '',
      needsPersonalEmail: Boolean(staff?.roles?.length) && !staff?.personalEmail,
      isStaff: Boolean(staff),
      status: 'member',
    })
  } catch (err) {
    console.error('/api/auth/me error:', err)
    return visitorResponse(req)
  }
}
