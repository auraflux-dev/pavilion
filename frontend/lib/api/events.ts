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
  ticket?: {
    price: number;
    capacity: number;
    soldCount: number;
    onSale: boolean;
  };
}

/** Extract plain text from a Wix rich-text description node tree or return the string as-is. */
function extractPlainText(desc: unknown): string | undefined {
  if (!desc) return undefined;
  if (typeof desc === "string") return desc;
  // Rich text: { nodes: [...], metadata: {...} }
  if (typeof desc === "object" && "nodes" in (desc as object)) {
    const nodes = (desc as { nodes?: unknown[] }).nodes ?? [];
    return nodes
      .map((node: unknown) => {
        if (typeof node !== "object" || !node) return "";
        const n = node as { nodes?: unknown[]; textData?: { text?: string } };
        if (n.textData?.text) return n.textData.text;
        if (n.nodes) return extractPlainText({ nodes: n.nodes });
        return "";
      })
      .join(" ")
      .trim() || undefined;
  }
  return undefined;
}

export async function getUpcomingEvents(limit = 6): Promise<WixEvent[]> {
  try {
    const client = getWixClient();
    const result = await client.wixEventsV2
      .queryEvents()
      .eq("status", "SCHEDULED")
      .ascending("dateAndTimeSettings.startDate")
      .limit(limit)
      .find();

    const mapped = (result.items ?? []).map((e: unknown) => {
      const ev = e as Record<string, unknown>;
      const dts = ev.dateAndTimeSettings as Record<string, unknown> | undefined;
      return {
        id: (ev._id as string) ?? (ev.id as string),
        title: ev.title as string,
        description: extractPlainText(ev.description),
        location: ev.location as WixEvent["location"],
        dateAndTimeSettings: dts
          ? {
              startDate: dts.startDate ? String(dts.startDate) : undefined,
              endDate: dts.endDate ? String(dts.endDate) : undefined,
            }
          : undefined,
        mainImage: ev.mainImage as WixEvent["mainImage"],
        slug: ev.slug as string,
        tags: ev.tags as string[],
      } satisfies WixEvent;
    });

    // Hide Wix template placeholder events still in the Events catalog
    const filtered = mapped.filter((ev) => {
      const desc = (ev.description || "").toLowerCase();
      const title = (ev.title || "").toLowerCase();
      if (desc.includes("click here to open up the event editor")) return false;
      if (desc.includes("i’m an event description") || desc.includes("i'm an event description"))
        return false;
      if (title === "bake sale" && desc.includes("event editor")) return false;
      return true;
    });

    try {
      const { listEventTicketOffers } = await import("@/lib/events/tickets");
      const offers = await listEventTicketOffers();
      const byId = new Map(offers.map((o) => [o.eventId, o]));
      return filtered.map((ev) => {
        const offer = ev.id ? byId.get(ev.id) : undefined;
        if (!offer || offer.ticketPrice <= 0) return ev;
        return {
          ...ev,
          ticket: {
            price: offer.ticketPrice,
            capacity: offer.capacity,
            soldCount: offer.soldCount,
            onSale: offer.active && offer.registrationOpen,
          },
        };
      });
    } catch {
      return filtered;
    }
  } catch {
    return [];
  }
}
