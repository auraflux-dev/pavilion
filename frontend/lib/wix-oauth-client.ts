/**
 * Wix OAuth client — used for visitor/member authenticated calls.
 * Separate from wix-client.ts (which uses ApiKeyStrategy for admin/server calls).
 * This client is safe to use client-side with OAuthStrategy + tokens from cookies.
 */
import { createClient, OAuthStrategy } from '@wix/sdk'
import { members } from '@wix/members'
import { items } from '@wix/data'
import type { Tokens } from '@wix/sdk'

export const WIX_OAUTH_CLIENT_ID = process.env.NEXT_PUBLIC_WIX_CLIENT_ID!

/**
 * Wix-managed login page domain (temp until custom domain is live).
 * Wix login redirects go through this domain.
 */
export const WIX_LOGIN_DOMAIN = 'https://treasurer7596.wixsite.com/shms-pto-2026'

export const CALLBACK_PATH = '/auth/callback'

/**
 * OAuth redirect_uri must match the host the user is actually on.
 * Never fall back to localhost in a browser session — that breaks production
 * login when an old build baked NEXT_PUBLIC_SITE_URL=http://localhost:3000.
 */
export function getCallbackUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    // Guard: refuse localhost callback when page is clearly hosted elsewhere
    if (
      origin.includes('localhost') &&
      typeof document !== 'undefined' &&
      !document.location.hostname.includes('localhost')
    ) {
      return `https://${document.location.host}${CALLBACK_PATH}`
    }
    return `${origin}${CALLBACK_PATH}`
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
  if (site && !site.includes('localhost')) {
    return `${site}${CALLBACK_PATH}`
  }
  // Pre-DNS production fallback (never localhost)
  return `https://frontend-six-rho-48.vercel.app${CALLBACK_PATH}`
}

/** Create a client with existing tokens (member or visitor). */
export function createOAuthClient(tokens?: Tokens) {
  return createClient({
    modules: { members, items },
    auth: OAuthStrategy({
      clientId: WIX_OAUTH_CLIENT_ID,
      tokens,
    }),
  })
}

/** Create a client with no tokens — visitor anonymous session. */
export function createVisitorClient() {
  return createClient({
    modules: { members, items },
    auth: OAuthStrategy({ clientId: WIX_OAUTH_CLIENT_ID }),
  })
}
