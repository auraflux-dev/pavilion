import { getWixClient } from "@/lib/wix-client";

export interface VolunteerOpportunity {
  _id: string;
  title: string;
  description: string;
  commitment: string;
  icon: string;
  sortOrder: number;
  active: boolean;
}

export async function getVolunteerOpportunities(): Promise<VolunteerOpportunity[]> {
  const client = getWixClient();
  try {
    const result = await client.items
      .query("VolunteerOpportunities")
      .eq("active", true)
      .ascending("sortOrder")
      .find();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.items.map((item: any) => item as VolunteerOpportunity);
  } catch {
    return [];
  }
}

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
