import { getWixClient } from "@/lib/wix-client";

export interface Program {
  _id: string;
  name: string;
  description: string;
  fee: number;
  capacity: number;
  registrationOpen: boolean;
  cheddarupUrl?: string;
  requiresWaiver: boolean;
  grades: string;
  category?: string;
  paymentType?: 'wix' | 'cheddarup_installment' | 'cheddarup_p2p';
}

export async function getPrograms(): Promise<Program[]> {
  const client = getWixClient();
  const result = await client.items
    .query("Programs")
    .eq("registrationOpen", true)
    .find();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.items.map((item: any) => item as Program);
}

export async function getAllPrograms(): Promise<Program[]> {
  const client = getWixClient();
  const result = await client.items.query("Programs").find();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.items.map((item: any) => item as Program);
}

export async function getProgramById(id: string): Promise<Program | null> {
  const client = getWixClient();
  try {
    const item = await client.items.get("Programs", id);
    return item as Program;
  } catch {
    return null;
  }
}
