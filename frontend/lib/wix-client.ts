import { createClient, ApiKeyStrategy } from "@wix/sdk";
import { items } from "@wix/data";
import * as wixEvents from "@wix/events";
import { isDemoInstance } from "@/lib/demo/instance";
import { isSyntheticStagingMode } from "@/lib/fixtures/synthetic-mode";

// Server-side only. never import this in client components
export function getWixClient() {
  if (process.env.COMMONS_PLATFORM === 'true') {
    throw new Error('Wix client is not used on Commons platform')
  }
  // Demo must never call school (or any) Wix. Use lib/demo fixtures instead.
  if (isDemoInstance()) {
    throw new Error('Wix client is not used on demo instance')
  }
  if (isSyntheticStagingMode()) {
    throw new Error('Wix client is not used in synthetic staging mode')
  }
  const siteId = process.env.WIX_SITE_ID;
  const apiKey = process.env.WIX_API_KEY;

  if (!siteId || !apiKey) {
    throw new Error("WIX_SITE_ID and WIX_API_KEY must be set in environment variables");
  }

  return createClient({
    modules: {
      items,
      wixEventsV2: wixEvents.wixEventsV2,
      categories: wixEvents.categories,
    },
    auth: ApiKeyStrategy({ siteId, apiKey }),
  });
}
