import { NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import { backfillGrowthContactsFromVendorOrders } from "@/lib/growth/orderContacts";

export const maxDuration = 60;

/** Backfill CRM contacts from paid Discover checkout orders for this vendor. */
export async function POST() {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  if (!auth.ctx.vendorProfileId) {
    return NextResponse.json(
      { error: "Platform scope cannot import vendor checkout buyers." },
      { status: 400 },
    );
  }

  try {
    const result = await backfillGrowthContactsFromVendorOrders(auth.ctx.vendorProfileId);

    const parts = [
      `${result.ordersProcessed} paid order${result.ordersProcessed === 1 ? "" : "s"} processed`,
      `${result.contactsCreated} new contact${result.contactsCreated === 1 ? "" : "s"}`,
      `${result.contactsUpdated} updated`,
    ];

    return NextResponse.json({
      ok: true,
      ...result,
      message: parts.join(" · "),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not import checkout buyers.";

    console.error("[growth/contacts/sync-orders]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
