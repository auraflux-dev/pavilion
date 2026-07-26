import { getWixClient } from "@/lib/wix-client";

export async function subscribeToNewsletter(email: string): Promise<void> {
  const client = getWixClient();

  // Check for duplicate before inserting
  const existing = await client.items
    .query("NewsletterSubscribers")
    .eq("email", email)
    .find();

  if (existing.items.length > 0) {
 return; // Already subscribed. silent success
  }

  await client.items.insert("NewsletterSubscribers", {
    email,
    subscribedAt: new Date().toISOString(),
  });
}
