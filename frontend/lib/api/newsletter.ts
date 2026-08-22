import { getWixClient } from "@/lib/wix-client";
import { sanitizeDirectoryEmail } from "@/lib/staff/mass-email";
import { isNewsletterOptedOut } from "@/lib/staff/newsletter-unsubscribe";

export async function subscribeToNewsletter(email: string): Promise<void> {
  const client = getWixClient();
  const normalized = sanitizeDirectoryEmail(email);

  const existing = await client.items
    .query("NewsletterSubscribers")
    .eq("email", normalized)
    .find();

  const row = existing.items?.[0] as { _id?: string; active?: boolean } | undefined;
  if (row?._id) {
    if (row.active !== false && !isNewsletterOptedOut(row as Record<string, unknown>)) {
      return;
    }
    await client.items.update("NewsletterSubscribers", {
      _id: row._id,
      email: normalized,
      active: true,
      subscribedAt: new Date().toISOString(),
      unsubscribedAt: '',
    });
    return;
  }

  await client.items.insert("NewsletterSubscribers", {
    email: normalized,
    subscribedAt: new Date().toISOString(),
    active: true,
  });
}
