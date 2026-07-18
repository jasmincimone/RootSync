import { NextRequest, NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import {
  createGrowthContact,
  isGrowthContactStatus,
  listGrowthContacts,
} from "@/lib/growth/contacts";

export async function GET() {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;

  const contacts = await listGrowthContacts(auth.ctx.vendorProfileId, auth.ctx.isPlatformScope);
  return NextResponse.json({ contacts });
}

export async function POST(request: NextRequest) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const statusRaw = typeof body?.status === "string" ? body.status.trim() : "";
  const status = statusRaw && isGrowthContactStatus(statusRaw) ? statusRaw : undefined;
  const phone = typeof body?.phone === "string" ? body.phone : null;
  const leadSource = typeof body?.leadSource === "string" ? body.leadSource : null;
  const funnelId = typeof body?.funnelId === "string" ? body.funnelId : null;

  const contact = await createGrowthContact({
    vendorProfileId: auth.ctx.vendorProfileId,
    name,
    email,
    phone,
    status,
    leadSource,
    funnelId,
  });

  return NextResponse.json({ contact }, { status: 201 });
}
