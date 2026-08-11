/**
 * GET /api/auth/me
 * Returns the current member's profile + free/paid membership summary.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient } from '@/lib/wix-oauth-client'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { getWixClient } from '@/lib/wix-client'
import { isMemberTokens, parseTokensCookie } from '@/lib/auth'
import { getEffectiveParentEmail } from '@/lib/staff/session'
import { resolveStaffForSession } from '@/lib/staff/roles'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractEmail(member: any): string {
  const emailEntry = member?.contact?.emails?.[0]
  const fromContact =
    typeof emailEntry === 'object' && emailEntry !== null && 'email' in emailEntry
      ? String(emailEntry.email)
      : typeof emailEntry === 'string'
        ? emailEntry
        : ''
  return String(member?.loginEmail ?? fromContact ?? '')
    .trim()
    .toLowerCase()
}

export async function GET(req: NextRequest) {
  try {
    const tokens = parseTokensCookie(req.cookies.get(TOKENS_COOKIE)?.value)
    if (!tokens || !isMemberTokens(tokens)) {
      return NextResponse.json({ status: 'visitor', member: null }, { status: 200 })
    }

    const client = createOAuthClient(tokens)
    const { member } = await client.members.getCurrentMember({
      fieldsets: ['FULL'],
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const actorEmail = extractEmail(member)
    const effective = await getEffectiveParentEmail(req)
    const email = effective?.parentEmail ?? actorEmail
    const actingAs = Boolean(effective?.actingAs)
    const linkedHousehold = Boolean(effective?.linkedHousehold)
    const staff = effective?.staff ?? (await resolveStaffForSession(actorEmail))
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
