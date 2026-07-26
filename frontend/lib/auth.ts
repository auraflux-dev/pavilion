/**
 * Shared auth helpers for cookies / middleware / API routes.
 */
import type { Tokens } from '@wix/sdk'

export type TokenRole = 'member' | 'visitor' | 'none' | string

/** True when the cookie holds a logged-in Wix member session (not anonymous visitor). */
export function isMemberTokens(tokens: Tokens | null | undefined): boolean {
  if (!tokens?.refreshToken?.value) return false
  const role = (tokens.refreshToken as { role?: TokenRole }).role
 // Older cookies may omit role. treat presence of a refresh token from
  // getMemberTokens as member only when role is explicitly member, or when
  // role is missing but access token exists AND role isn't visitor.
  if (role === 'member') return true
  if (role === 'visitor' || role === 'none') return false
  // Ambiguous legacy cookies: require role member (fail closed for portal)
  return false
}

export function parseTokensCookie(raw: string | undefined): Tokens | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as Tokens
  } catch {
    return null
  }
}
