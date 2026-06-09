import { NextRequest, NextResponse } from "next/server";
import { getWixClient } from "@/lib/wix-client";
import crypto from "crypto";

// Verify the request came from Cheddarup using HMAC-SHA256 signature
function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.CHEDDARUP_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex")
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-cheddarup-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

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
