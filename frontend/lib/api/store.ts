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

export interface SpiritItem {
  _id: string;
  name: string;
  price: number;
  image?: string;
  inStock: boolean;
  slug: string;
}

/**
 * IDs of the 12 SHMS school store products created in Wix Stores Catalog V3.
 * Filters out Wix demo products that ship pre-loaded in new accounts.
 */
const SHMS_PRODUCT_IDS = new Set([
  "90ae23f7-51f4-438d-869c-1fbb28afd381", // Airheads Chewing Gum
  "96ca63ab-2535-4f91-8ad1-28a5d7d7d7d0", // Nerds Gummy Clusters
  "ad137b27-cfa1-45ff-b506-c1021bfad12f", // Hubba Bubba Bubble Gum Tape
  "a3e4a887-ad91-42b2-843d-653a11712544", // Life Savers Swirl Lollipops
  "530bfb7e-370e-4174-8e2f-4463b5f34642", // Orion Choco Mont Mushroom Biscuits
  "53d1d89c-74e3-4f41-9988-5594ce2d590b", // Pop Rocks
  "fac09820-055c-4202-81ac-545639b8e24f", // M&Ms Minis Tubes
  "03be5162-4928-4c39-b707-6e2de07921e0", // Airheads Xtremes Belts
  "62b109c8-7b96-4f0d-b09d-fb8d93ff8f9d", // Jolly Rancher Lollipops
  "fd0bcb5b-6d08-4f0e-bb7c-27bfdc023ae4", // Sour Patch Kids Watermelon
  "d9ed5b01-324d-4136-809d-21a3211b9d89", // Charms Blow Pops Mini
  "9e7d4b13-4437-4c51-b63d-4942d18edf64", // Takis Variety Pack (1oz)
]);

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
    brand: name.split(" ")[0] ?? "",           // brand not stored separately in Stores catalog
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
    // Keep only the 12 SHMS school store products we created (by catalog ID).
    // This excludes Wix demo products that come pre-loaded in new accounts.
    return all.filter((p) => SHMS_PRODUCT_IDS.has(p._id));
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

const SPIRIT_PRODUCT_IDS = new Set([
  "82ee7b02-5b3e-4383-8cd8-fcf089b45370", // Stingrays Yard Sign
  "1c0e1c1c-23f8-4095-8e4d-a9c467e6fef8", // Stingrays Hat
  "d0bed142-0410-4442-a8e9-f1a5232862ef", // Stingrays Water Bottle
  "d5730ad6-8d4a-4757-93fa-05aa3ff1e244", // Stingrays Drawstring Bag
  "e9fbcab5-ae25-418e-a4ac-81889d93acc7", // Stingrays Hoodie
  "f3eedab0-bfd5-4f30-ad8f-7586b783b78f", // Stingrays Long Sleeve Shirt
  "791e1007-b926-4416-8a90-24dd641d0887", // Stingrays Spirit T-Shirt
]);

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
    return (data.products ?? [])
      .filter((p) => SPIRIT_PRODUCT_IDS.has(p.id as string))
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
