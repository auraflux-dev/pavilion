/**
 * Fetches products from Wix Stores Catalog V3 (not CMS StoreItems).
 * Products live at: Wix Dashboard → Catalog → Products
 * Which IDs appear on /store and /spirit-wear: SiteSettings storeProductIds / spiritWearProductIds
 */
import { getCatalogConfig } from '@/lib/api/catalog-config'

export interface StoreItem {
 _id: string;
 name: string;
 brand: string;
 description: string;
 price: number;
 category: "Candy" | "Snacks" | "Drinks";
 inStock: boolean;
 featured: boolean;
 image?: string;
}

export interface SpiritItem {
 _id: string;
 name: string;
 price: number;
 image?: string;
 inStock: boolean;
 slug: string;
}

/** Convert a Wix media item id to a usable static URL */
function wixMediaIdToUrl(mediaId: unknown): string | undefined {
 if (!mediaId || typeof mediaId !== "string") return undefined;
 // Already a full URL
 if (mediaId.startsWith("http")) return mediaId;
  // wix:image://v1/ID/filename format
  const v1Match = mediaId.match(/wix:image:\/\/v1\/([^/]+)\//);
  if (v1Match) return `https://static.wixstatic.com/media/${v1Match[1]}`;
 // Raw media id like "abb7d1_xxx~mv2.jpg"
  if (mediaId.includes("~mv2")) return `https://static.wixstatic.com/media/${mediaId}`;
 return undefined;
}

/** Extract a display image URL from a Wix Stores V3 product */
function getProductImage(product: Record<string, unknown>): string | undefined {
 try {
 const media = product.media as Record<string, unknown> | undefined;
 if (!media) return undefined;
 const itemsInfo = media.itemsInfo as Record<string, unknown> | undefined;
 const items = itemsInfo?.items as Array<Record<string, unknown>> | undefined;
 const first = items?.[0];
 if (!first) return undefined;
 // id is the wix media id
 return wixMediaIdToUrl(first.id) ?? wixMediaIdToUrl(first.url);
 } catch {
 return undefined;
 }
}

/** Infer category from product name/description. Wix Stores has no custom category field */
function inferCategory(name: string): StoreItem["category"] {
 const lower = name.toLowerCase();
 if (lower.includes("takis") || lower.includes("mushroom") || lower.includes("biscuit")) {
 return "Snacks";
 }
 return "Candy";
}

/** Map a raw Wix Stores V3 product to our StoreItem shape */
function mapProduct(raw: Record<string, unknown>): StoreItem {
 const name = (raw.name as string) ?? "";

 // "Deal of the Week" = product has a ribbon set (ribbon is an object { name: string })
 const ribbonName = (raw.ribbon as Record<string, unknown> | undefined)?.name;
 const featured = typeof ribbonName === "string" && ribbonName.trim().length > 0;

 // Price lives in variantSummary.minPriceVariant.price.actualPrice.amount
 let price = 0;
 let inStock = false;
 try {
 const vs = raw.variantSummary as Record<string, unknown> | undefined;
 const mpv = vs?.minPriceVariant as Record<string, unknown> | undefined;
 const priceAmount = ((mpv?.price as Record<string, unknown>)
 ?.actualPrice as Record<string, unknown>)?.amount;
 price = parseFloat((priceAmount as string) ?? "0") || 0;
 inStock = (mpv?.inventoryStatus as Record<string, unknown>)?.inStock === true;
 } catch { /* leave 0 / false */ }

 // Also check top-level actualPriceRange as fallback
 if (price === 0) {
 try {
 const apr = raw.actualPriceRange as Record<string, unknown> | undefined;
 const min = (apr?.minValue as Record<string, unknown>)?.amount;
 price = parseFloat((min as string) ?? "0") || 0;
 } catch { /* ignore */ }
 }

 return {
 _id: (raw.id as string) ?? (raw._id as string) ?? "",
 name,
 brand: name.split(" ")[0] ?? "", // brand not stored separately in Stores catalog
    description: (raw.plainDescription as string)?.replace(/<[^>]+>/g, "") ?? "",
 price,
 category: inferCategory(name),
 inStock,
 featured,
 image: getProductImage(raw),
 };
}

export async function getStoreItems(): Promise<StoreItem[]> {
 try {
 const apiKey = process.env.WIX_API_KEY;
 const siteId = process.env.WIX_SITE_ID;
 if (!apiKey || !siteId) return [];

    const res = await fetch("https://www.wixapis.com/stores/v3/products/query", {
 method: "POST",
 headers: {
        "Content-Type": "application/json",
 Authorization: apiKey,
 "wix-site-id": siteId,
 },
 body: JSON.stringify({
 query: {
 filter: { visible: { $eq: true } },
 paging: { limit: 100 },
 },
 fields: ["PLAIN_DESCRIPTION", "MEDIA_ITEMS_INFO", "MIN_PRICE_VARIANT"],
 }),
 next: { revalidate: 300 },
 });

 if (!res.ok) return [];
 const data = (await res.json()) as { products?: Record<string, unknown>[] };
 const all = (data.products ?? []).map(mapProduct);
 const { storeProductIds } = await getCatalogConfig();
 // SiteSettings storeProductIds. excludes Wix demo catalog junk.
 return all.filter((p) => storeProductIds.has(p._id));
 } catch {
 return [];
 }
}

/**
 * Returns "Deal of the Week" items.
 * To feature a product: Wix Dashboard → Catalog → Products → open product → set a Ribbon (e.g. "Deal").
 * To remove it: clear the Ribbon field. No code change needed.
 */
export async function getFeaturedItems(): Promise<StoreItem[]> {
 const all = await getStoreItems();
 return all.filter((i) => i.featured);
}

export async function getSpiritWearItems(): Promise<SpiritItem[]> {
 try {
 const apiKey = process.env.WIX_API_KEY;
 const siteId = process.env.WIX_SITE_ID;
 if (!apiKey || !siteId) return [];

    const res = await fetch("https://www.wixapis.com/stores/v3/products/query", {
 method: "POST",
 headers: {
        "Content-Type": "application/json",
 Authorization: apiKey,
 "wix-site-id": siteId,
 },
 body: JSON.stringify({
 query: { filter: { visible: { $eq: true } }, paging: { limit: 100 } },
 fields: ["MEDIA_ITEMS_INFO", "MIN_PRICE_VARIANT"],
 }),
 next: { revalidate: 300 },
 });

 if (!res.ok) return [];
 const data = (await res.json()) as { products?: Record<string, unknown>[] };
 const { spiritWearProductIds } = await getCatalogConfig();
 return (data.products ?? [])
 .filter((p) => spiritWearProductIds.has(p.id as string))
 .map((raw) => {
 let price = 0;
 let inStock = false;
 try {
 const vs = raw.variantSummary as Record<string, unknown> | undefined;
 const mpv = vs?.minPriceVariant as Record<string, unknown> | undefined;
 const amt = ((mpv?.price as Record<string, unknown>)?.actualPrice as Record<string, unknown>)?.amount;
 price = parseFloat((amt as string) ?? "0") || 0;
 inStock = (mpv?.inventoryStatus as Record<string, unknown>)?.inStock === true;
 } catch { /* ignore */ }
 if (price === 0) {
 try {
 const apr = raw.actualPriceRange as Record<string, unknown> | undefined;
 price = parseFloat(((apr?.minValue as Record<string, unknown>)?.amount as string) ?? "0") || 0;
 } catch { /* ignore */ }
 }
 return {
 _id: (raw.id as string) ?? "",
 name: (raw.name as string) ?? "",
 price,
 image: getProductImage(raw),
 inStock,
 slug: (raw.slug as string) ?? "",
 };
 });
 } catch {
 return [];
 }
}
