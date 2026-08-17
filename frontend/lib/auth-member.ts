import { NextRequest } from 'next/server'
import { createOAuthClient } from '@/lib/wix-oauth-client'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { isMemberTokens, parseTokensCookie } from '@/lib/auth'
import { collectMemberEmails, pickSessionEmail } from '@/lib/member-emails'

export async function getMemberSession(req: NextRequest) {
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
