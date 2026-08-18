/**
 * GET /api/auth/me
 * Returns the current member's profile + free/paid membership summary.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient } from '@/lib/wix-oauth-client'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { getWixClient } from '@/lib/wix-client'
import { isMemberTokens, parseTokensCookie } from '@/lib/auth'
import { collectMemberEmails, pickSessionEmail } from '@/lib/member-emails'
import { getEffectiveParentEmail } from '@/lib/staff/session'
import { resolveStaffForSession } from '@/lib/staff/roles'
import { isDemoInstance } from '@/lib/demo/instance'
import {
  demoMemberId,
  demoStaffProfile,
  getDemoReviewSession,
} from '@/lib/demo/session'
import { demoReviewerStudents } from '@/lib/demo/seed'

export async function GET(req: NextRequest) {
  try {
    if (isDemoInstance()) {
      const demo = getDemoReviewSession(req)
      if (demo) {
        const staff = demo.lane === 'parent' ? null : demoStaffProfile(demo)
        const name = `${demo.firstName} ${demo.lastName}`.trim()
        const paid = demo.parentKind !== 'free'
        const students = demoReviewerStudents(demo)
        return NextResponse.json({
          member: {
            id: demoMemberId(demo.email),
            name,
            firstName: demo.firstName,
            lastName: demo.lastName,
            needsName: false,
            email: demo.email,
            profileImage: null,
            memberSince: new Date(demo.iat).toISOString(),
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

    const tokens = parseTokensCookie(req.cookies.get(TOKENS_COOKIE)?.value)
    if (!tokens || !isMemberTokens(tokens)) {
      return NextResponse.json(
        { status: 'visitor', member: null },
        {
          status: 200,
          headers: { 'Cache-Control': 'private, max-age=30' },
        },
      )
    }

    const client = createOAuthClient(tokens)
    const { member } = await client.members.getCurrentMember({
      fieldsets: ['FULL'],
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const memberEmails = collectMemberEmails(member)
    const actorEmail = pickSessionEmail(memberEmails)
    const effective = await getEffectiveParentEmail(req)
    const email = effective?.parentEmail ?? actorEmail
    const actingAs = Boolean(effective?.actingAs)
    const linkedHousehold = Boolean(effective?.linkedHousehold)
    const staff =
      effective?.staff ?? (await resolveStaffForSession(actorEmail, memberEmails))
    const adminClient = getWixClient()

    let storeCards: { balance: number; studentName: string }[] = []
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

    let membership: { tier: string; expiresAt: string; status?: string } | null = null
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
      // Membership benefits follow the primary (paying) household email
      if (householdEmail !== email) {
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
      (s) => s.membershipTier && s.membershipTier !== 'free'
    )
    const paidFromMemberships =
      !!membership?.tier &&
      membership.tier !== 'free' &&
      membership.status !== 'expired'
    const hasPaidMembership = paidFromStudents || paidFromMemberships
    const accountType: 'free' | 'paid' = hasPaidMembership ? 'paid' : 'free'

    const firstName = String(member.contact?.firstName ?? '').trim()
    const lastName = String(member.contact?.lastName ?? '').trim()
    const name = `${firstName} ${lastName}`.trim()

    return NextResponse.json({
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
      isStaff: Boolean(staff?.roles?.length),
    })
  } catch (err) {
    console.error('/api/auth/me error:', err)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}
