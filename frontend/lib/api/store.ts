/**
 * Fetches products from Wix Stores Catalog V3 (not CMS StoreItems).
 * Products live at: Wix Dashboard → Catalog → Products
 */

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

/** Infer category from product name/description — Wix Stores has no custom category field */
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

  // Price lives in variantsInfo.variants[0].price.actualPrice.amount
  let price = 0;
  try {
    const vi = raw.variantsInfo as Record<string, unknown> | undefined;
    const variants = vi?.variants as Array<Record<string, unknown>> | undefined;
    const amount = (variants?.[0]?.price as Record<string, unknown>)
      ?.actualPrice as Record<string, unknown> | undefined;
    price = parseFloat((amount?.amount as string) ?? "0") || 0;
  } catch { /* leave 0 */ }

  // Stock: check inventory managed status — default to true (in stock) if not set
  const inStock =
    (raw.stock as Record<string, unknown>)?.inStock !== false;

  return {
    _id: (raw.id as string) ?? (raw._id as string) ?? "",
    name,
    brand: name.split(" ")[0] ?? "",           // brand not stored separately in Stores catalog
    description: (raw.plainDescription as string)?.replace(/<[^>]+>/g, "") ?? "",
    price,
    category: inferCategory(name),
    inStock,
    featured: false,                            // no featured flag in Stores catalog; extend later
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
          paging: { limit: 50 },
        },
        fields: ["PLAIN_DESCRIPTION", "VARIANTS"],
      }),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];
    const data = (await res.json()) as { products?: Record<string, unknown>[] };
    return (data.products ?? []).map(mapProduct);
  } catch {
    return [];
  }
}

/**
 * Returns "featured" items — currently the first 3 in-stock products.
 * Extend this once a featured flag or Deal-of-the-Week field is added.
 */
export async function getFeaturedItems(): Promise<StoreItem[]> {
  const all = await getStoreItems();
  return all.filter((i) => i.inStock).slice(0, 3);
}
