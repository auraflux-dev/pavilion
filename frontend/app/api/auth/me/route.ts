/**
 * GET /api/auth/me
 * Returns the current member's profile + membership status + store card balance.
 * Server-side only — reads tokens from httpOnly cookie.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient } from '@/lib/wix-oauth-client'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { getWixClient } from '@/lib/wix-client'

export async function GET(req: NextRequest) {
  try {
    const tokensCookie = req.cookies.get(TOKENS_COOKIE)?.value
    if (!tokensCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const tokens = JSON.parse(tokensCookie)
    const client = createOAuthClient(tokens)

    // Get current member profile
    const { member } = await client.members.getCurrentMember({
      fieldsets: ['FULL'],
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const emailEntry = member.contact?.emails?.[0]
    const email =
      member.loginEmail ??
      (typeof emailEntry === 'object' && emailEntry !== null && 'email' in emailEntry
        ? (emailEntry as { email: string }).email
        : '') ??
      ''

    // Get store card balance from CMS (admin client)
    const adminClient = getWixClient()
    let storeCards: { balance: number; studentName: string }[] = []
    try {
      const cardsResult = await adminClient.items
        .query('StoreCards')
        .eq('parentEmail', email)
        .find()
      storeCards = (cardsResult.items ?? []).map((item) => ({
        balance: item.data?.balance ?? 0,
        studentName: item.data?.studentName ?? '',
      }))
    } catch {
      // StoreCards collection may not have data yet
    }

    // Get membership from CMS
    let membership: { tier: string; expiresAt: string } | null = null
    try {
      const membershipResult = await adminClient.items
        .query('Memberships')
        .eq('email', email)
        .find()
      const m = membershipResult.items?.[0]?.data
      if (m) {
        membership = { tier: m.tier, expiresAt: m.expiresAt }
      }
    } catch {
      // No membership record yet
    }

    return NextResponse.json({
      member: {
        id: member._id,
        name: `${member.contact?.firstName ?? ''} ${member.contact?.lastName ?? ''}`.trim(),
        email,
        profileImage: member.profile?.photo?.url ?? null,
      },
      storeCards,
      membership,
    })
  } catch (err) {
    console.error('/api/auth/me error:', err)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}
