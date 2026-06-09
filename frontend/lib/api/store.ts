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

function mapItem(item: { _id?: string; data?: Record<string, unknown> }): StoreItem {
  return {
    _id: (item._id as string) ?? "",
    name: (item.data?.name as string) ?? "",
    brand: (item.data?.brand as string) ?? "",
    description: (item.data?.description as string) ?? "",
    price: (item.data?.price as number) ?? 0,
    costPerUnit: (item.data?.costPerUnit as number) ?? 0,
    category: (item.data?.category as StoreItem["category"]) ?? "Snacks",
    inStock: (item.data?.inStock as boolean) ?? true,
    featured: (item.data?.featured as boolean) ?? false,
    featuredUntil: (item.data?.featuredUntil as string) ?? undefined,
    image: (item.data?.image as string) ?? undefined,
    asin: (item.data?.asin as string) ?? undefined,
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
