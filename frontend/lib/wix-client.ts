import { createClient, ApiKeyStrategy } from "@wix/sdk";
import { items } from "@wix/data";
import * as wixEvents from "@wix/events";

// Server-side only. never import this in client components
export function getWixClient() {
  const siteId = process.env.WIX_SITE_ID;
  const apiKey = process.env.WIX_API_KEY;

  if (!siteId || !apiKey) {
    throw new Error("WIX_SITE_ID and WIX_API_KEY must be set in environment variables");
  }

  return createClient({
    modules: { items, wixEventsV2: wixEvents.wixEventsV2 },
    auth: ApiKeyStrategy({ siteId, apiKey }),
  });
}
