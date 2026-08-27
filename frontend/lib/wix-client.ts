import { createClient, ApiKeyStrategy } from "@wix/sdk";
import { items } from "@wix/data";
import * as wixEvents from "@wix/events";
import { isDemoInstance } from "@/lib/demo/instance";
import { isSyntheticStagingMode } from "@/lib/fixtures/synthetic-mode";
import { isPavilionProductPlatform } from '@/lib/crm/platform-env'

export type WixServerClient = ReturnType<typeof createWixServerClient>

function createWixServerClient(siteId: string, apiKey: string) {
  return createClient({
    modules: {
      items,
      wixEventsV2: wixEvents.wixEventsV2,
      categories: wixEvents.categories,
    },
    auth: ApiKeyStrategy({ siteId, apiKey }),
  })
}

function wixBlockedReason(): string | null {
  if (isPavilionProductPlatform()) return 'Wix client is not used on Commons platform'
  if (isDemoInstance()) return 'Wix client is not used on demo instance'
  if (isSyntheticStagingMode()) return 'Wix client is not used in synthetic staging mode'
  return null
}

/** True when Wix CMS credentials are configured and allowed on this surface. */
export function hasWixCredentials(): boolean {
  if (wixBlockedReason()) return false
  return Boolean(process.env.WIX_SITE_ID?.trim() && process.env.WIX_API_KEY?.trim())
}

/** Server-side Wix client when env is set and allowed; null otherwise. */
export function tryGetWixClient(): WixServerClient | null {
  if (wixBlockedReason()) return null
  const siteId = process.env.WIX_SITE_ID?.trim()
  const apiKey = process.env.WIX_API_KEY?.trim()
  if (!siteId || !apiKey) return null
  return createWixServerClient(siteId, apiKey)
}

// Server-side only. never import this in client components
export function getWixClient(): WixServerClient {
  const blocked = wixBlockedReason()
  if (blocked) throw new Error(blocked)
  const client = tryGetWixClient()
  if (!client) {
    throw new Error('WIX_SITE_ID and WIX_API_KEY must be set in environment variables')
  }
  return client
}
