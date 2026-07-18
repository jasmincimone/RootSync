import { NextRequest, NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import {
  addGrowthContactNote,
  deleteGrowthContact,
  getGrowthContactForWorkspace,
  isGrowthContactStatus,
  updateGrowthContact,
} from "@/lib/growth/contacts";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const contact = await getGrowthContactForWorkspace(
    id,
    auth.ctx.vendorProfileId,
    auth.ctx.isPlatformScope,
  );
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ contact });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (typeof body?.note === "string" && body.note.trim()) {
    const note = await addGrowthContactNote({
      contactId: id,
      authorUserId: auth.ctx.userId,
      body: body.note,
      vendorProfileId: auth.ctx.vendorProfileId,
      isPlatformScope: auth.ctx.isPlatformScope,
    });
    if (!note) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    return NextResponse.json({ note });
  }

  const statusRaw = typeof body?.status === "string" ? body.status.trim() : undefined;
  if (statusRaw && !isGrowthContactStatus(statusRaw)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const contact = await updateGrowthContact(id, auth.ctx.vendorProfileId, auth.ctx.isPlatformScope, {
    name: typeof body?.name === "string" ? body.name : undefined,
    email: typeof body?.email === "string" ? body.email : undefined,
    phone: body?.phone === null || typeof body?.phone === "string" ? body.phone : undefined,
    status: statusRaw,
    leadSource:
      body?.leadSource === null || typeof body?.leadSource === "string"
        ? body.leadSource
        : undefined,
    funnelId:
      body?.funnelId === null || typeof body?.funnelId === "string" ? body.funnelId : undefined,
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ contact });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const ok = await deleteGrowthContact(id, auth.ctx.vendorProfileId, auth.ctx.isPlatformScope);
  if (!ok) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
