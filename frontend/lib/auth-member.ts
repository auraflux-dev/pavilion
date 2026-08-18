import { NextRequest } from 'next/server'
import { createOAuthClient } from '@/lib/wix-oauth-client'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { isMemberTokens, parseTokensCookie } from '@/lib/auth'
import { collectMemberEmails, pickSessionEmail } from '@/lib/member-emails'
import { isDemoInstance } from '@/lib/demo/instance'
import { demoMemberId, getDemoReviewSession } from '@/lib/demo/session'

async function loadWixMemberSession(req: NextRequest) {
  const tokens = parseTokensCookie(req.cookies.get(TOKENS_COOKIE)?.value)
  if (!tokens || !isMemberTokens(tokens)) return null

  const oauthClient = createOAuthClient(tokens)
  const { member } = await oauthClient.members.getCurrentMember({
    fieldsets: ['FULL'],
  })
  const emails = collectMemberEmails(member)
  const email = pickSessionEmail(emails)
  if (!member?._id || !email) return null

  return { tokens, oauthClient, member, email, emails, memberId: member._id }
}

type WixMemberSession = NonNullable<Awaited<ReturnType<typeof loadWixMemberSession>>>

export async function getMemberSession(req: NextRequest): Promise<WixMemberSession | null> {
  if (isDemoInstance()) {
    const demo = getDemoReviewSession(req)
    if (demo) {
      const memberId = demoMemberId(demo.email)
      return {
        tokens: {
          accessToken: { value: 'demo', expiresAt: Date.now() + 86_400_000 },
          refreshToken: { value: 'demo', role: 'member' },
        },
        oauthClient: createOAuthClient(),
        member: {
          _id: memberId,
          loginEmail: demo.email,
          contact: { firstName: demo.firstName, lastName: demo.lastName },
          profile: {},
          _createdDate: new Date(demo.iat).toISOString(),
        },
        email: demo.email,
        emails: [demo.email],
        memberId,
      } as unknown as WixMemberSession
    }
  }

  return loadWixMemberSession(req)
}
