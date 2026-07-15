/**
 * POST /api/students — create a student record linked to the logged-in parent
 * GET  /api/students — return all students for the logged-in parent
 */
import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient } from '@/lib/wix-oauth-client'
import { getWixClient } from '@/lib/wix-client'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'

function getMemberEmail(req: NextRequest): { tokens: any; email: string } | null {
  const tokensCookie = req.cookies.get(TOKENS_COOKIE)?.value
  if (!tokensCookie) return null
  try {
    const tokens = JSON.parse(tokensCookie)
    return { tokens, email: '' }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const tokensCookie = req.cookies.get(TOKENS_COOKIE)?.value
  if (!tokensCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tokens = JSON.parse(tokensCookie)
    const oauthClient = createOAuthClient(tokens)
    const { member } = await oauthClient.members.getCurrentMember({ fieldsets: ['FULL'] })
    const email = member?.loginEmail ?? ''
    if (!email) return NextResponse.json({ error: 'No email on account' }, { status: 400 })

    const adminClient = getWixClient()
    const result = await adminClient.items
      .query('Students')
      .eq('parentEmail', email)
      .find()

    const students = (result.items ?? []).map((item: any) => ({
      id: item._id,
      firstName: item.firstName ?? '',
      lastName: item.lastName ?? '',
      grade: item.grade ?? '',
      membershipTier: item.membershipTier ?? 'free',
      membershipStatus: item.membershipStatus ?? 'active',
      discountCode: item.discountCode ?? null,
      storeCardBalance: item.storeCardBalance ?? 0,
    }))

    return NextResponse.json({ students })
  } catch (err) {
    console.error('/api/students GET error:', err)
    return NextResponse.json({ error: 'Failed to load students' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const tokensCookie = req.cookies.get(TOKENS_COOKIE)?.value
  if (!tokensCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tokens = JSON.parse(tokensCookie)
    const oauthClient = createOAuthClient(tokens)
    const { member } = await oauthClient.members.getCurrentMember({ fieldsets: ['FULL'] })
    const email = member?.loginEmail ?? ''
    if (!email) return NextResponse.json({ error: 'No email on account' }, { status: 400 })

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
      parentEmail: email,
      parentFirstName: member?.contact?.firstName ?? '',
      parentLastName: member?.contact?.lastName ?? '',
      membershipTier: 'free',
      membershipStatus: 'active',
      storeCardBalance: 0,
      discountCode: null,
      jumbulaSid: '',
      allergies: '',
      emergencyContact: '',
      emergencyPhone: '',
      parentPhone: '',
    })

    return NextResponse.json({
      student: {
        id: (result as any)._id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        grade: grade.trim(),
        membershipTier: 'free',
        membershipStatus: 'active',
        discountCode: null,
        storeCardBalance: 0,
      },
    })
  } catch (err) {
    console.error('/api/students POST error:', err)
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
  }
}
