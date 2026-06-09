/**
 * NOTE: Wix SDK .eq("featured", true) translates to filter on "data.featured"
 * internally which returns 0 results against this CMS collection. The correct
 * REST filter uses the plain field name: { "featured": { "$eq": true } }.
 * Since we only have ~12 items, we fetch all and filter client-side — clean,
 * no SDK internals hacked.
 */
import { getWixClient } from "@/lib/wix-client";

export interface StoreItem {
  _id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  costPerUnit: number;
  category: "Candy" | "Snacks" | "Drinks";
  inStock: boolean;
  featured: boolean;
  featuredUntil?: string;
  image?: string;
  asin?: string;
}

function mapItem(raw: Record<string, unknown>): StoreItem {
  // Wix CMS SDK returns fields directly on the item object, not nested under .data
  const item = (raw.data && typeof raw.data === "object")
    ? (raw.data as Record<string, unknown>)
    : raw;
  return {
    _id: (raw._id as string) ?? "",
    name: (item.name as string) ?? "",
    brand: (item.brand as string) ?? "",
    description: (item.description as string) ?? "",
    price: (item.price as number) ?? 0,
    costPerUnit: (item.costPerUnit as number) ?? 0,
    category: (item.category as StoreItem["category"]) ?? "Snacks",
    inStock: (item.inStock as boolean) ?? true,
    featured: (item.featured as boolean) ?? false,
    featuredUntil: (item.featuredUntil as string) ?? undefined,
    image: (item.image as string) ?? undefined,
    asin: (item.asin as string) ?? undefined,
  };
}

export async function getStoreItems(): Promise<StoreItem[]> {
  try {
    const client = getWixClient();
    const result = await client.items.query("StoreItems").find();
    return (result.items ?? []).map(mapItem);
  } catch {
    return [];
  }
}

/**
 * Returns featured items by fetching all and filtering in JS.
 * Avoids the SDK boolean filter bug (prefixes "data." on field names).
 */
export async function getFeaturedItems(): Promise<StoreItem[]> {
  try {
    const all = await getStoreItems();
    const today = new Date().toISOString().split("T")[0];
    return all.filter(
      (i) => i.featured && (!i.featuredUntil || i.featuredUntil >= today)
    );
  } catch {
    return [];
  }
}
