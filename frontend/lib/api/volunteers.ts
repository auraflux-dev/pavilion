import { getWixClient } from "@/lib/wix-client";

export interface VolunteerSubmission {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  opportunity: string;
  eventDate?: string;
  notes?: string;
}

export async function submitVolunteerForm(
  data: VolunteerSubmission
): Promise<void> {
  const client = getWixClient();
  await client.items.insert("Volunteers", {
    ...data,
    status: "new",
    submittedAt: new Date().toISOString(),
  });
}
