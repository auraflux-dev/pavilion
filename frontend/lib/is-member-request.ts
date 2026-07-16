/**
 * Server-side: true when request cookies hold a Wix member session.
 * Used to keep WhatsApp invite URLs out of anonymous HTML (SSR).
 */
import { cookies } from 'next/headers'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { isMemberTokens, parseTokensCookie } from '@/lib/auth'

export async function isMemberRequest(): Promise<boolean> {
  try {
    const jar = await cookies()
    const tokens = parseTokensCookie(jar.get(TOKENS_COOKIE)?.value)
    return isMemberTokens(tokens)
  } catch {
    return false
  }
}
