import { NextRequest, NextResponse } from "next/server";
import { getWixClient } from "@/lib/wix-client";

export async function POST(req: NextRequest) {
  // Token passed as query param since Zapier doesn't sign requests
  const token = req.nextUrl.searchParams.get("token");
  if (token !== process.env.CHEDDARUP_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await req.text();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client = getWixClient();

  await client.items.insert("Payments", {
    payerEmail: payload.payer_email ?? payload.email,
    payerName: payload.payer_name ?? payload.name,
    amount: payload.amount,
    collectionName: payload.collection_name ?? payload.form_name,
    itemDescription: payload.item_name ?? payload.item_description,
    source: "cheddarup",
    transactionId: payload.transaction_id ?? payload.id,
    paidAt: payload.paid_at ?? new Date().toISOString(),
    syncedToMoneyMinder: false,
  });

  return NextResponse.json({ ok: true });
}
