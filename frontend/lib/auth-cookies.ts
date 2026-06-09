/**
 * Cookie helpers for Wix OAuth tokens.
 * Keeps token names in one place — used by middleware, callback, and logout.
 */

export const TOKENS_COOKIE = 'wix_tokens'
export const OAUTH_DATA_COOKIE = 'wix_oauth_data'

/** Cookie max-age in seconds — 30 days (refresh token lifetime). */
export const TOKEN_MAX_AGE = 60 * 60 * 24 * 30

/** Secure flag: true in production, false in local dev. */
export function isSecure(): boolean {
  return process.env.NODE_ENV === 'production'
}
