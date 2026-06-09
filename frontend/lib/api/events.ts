import { getWixClient } from "@/lib/wix-client";

export interface WixEvent {
  id?: string;
  title?: string;
  description?: string;
  location?: { name?: string };
  dateAndTimeSettings?: {
    startDate?: string;
    endDate?: string;
  };
  mainImage?: { url?: string };
  slug?: string;
  tags?: string[];
}

export async function getUpcomingEvents(limit = 6): Promise<WixEvent[]> {
  const client = getWixClient();
  const result = await client.wixEventsV2
    .queryEvents()
    .eq("status", "SCHEDULED")
    .ascending("dateAndTimeSettings.startDate")
    .limit(limit)
    .find();

  return (result.items ?? []) as WixEvent[];
}
