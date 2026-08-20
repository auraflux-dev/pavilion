import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
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
  const { isDemoInstance } = await import('@/lib/demo/instance')
  if (isDemoInstance()) {
    const { DEMO_VOLUNTEER } = await import('@/lib/demo/content')
    return [...DEMO_VOLUNTEER]
  }
  if (process.env.COMMONS_PLATFORM === 'true') return []
  const client = getWixClient();
  try {
    const result = await client.items
      .query("VolunteerOpportunities")
      .eq("active", true)
      .ascending("sortOrder")
      .find();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (result.items as VolunteerOpportunity[]).filter(
      (item) =>
        item?.title &&
        !isCmsQaItem(item.title, item.description, item.commitment),
    );
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
