import { getWixClient } from "@/lib/wix-client";

export interface StudentRecord {
  _id: string;
  firstName: string;
  lastName: string;
  grade: string;
  parentEmail: string;
  parentFirstName: string;
  parentLastName: string;
  storeCardCode?: string;
  storeCardBalance?: number;
  membershipStatus: "none" | "active" | "expired";
  membershipTier?: "free" | "ruby" | "supreme";
}

// Called server-side from member portal after OAuth — email comes from Wix session
export async function getStudentsByParentEmail(
  parentEmail: string
): Promise<StudentRecord[]> {
  const client = getWixClient();
  const result = await client.items
    .query("Students")
    .eq("parentEmail", parentEmail)
    .find();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.items
    .filter((item: any) => item.archived !== true)
    .map((item: any) => item as StudentRecord);
}
