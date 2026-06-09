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
export const WIX_LOGIN_DOMAIN = 'https://gregoryrobertc.wixsite.com/shms-pto-2026'

export const CALLBACK_PATH = '/auth/callback'

export function getCallbackUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  return `${base}${CALLBACK_PATH}`
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
