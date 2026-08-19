import { NextRequest, NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import {
  assignContactsToGrowthFunnel,
  deleteGrowthFunnel,
  getGrowthFunnelForWorkspace,
  GrowthFunnelSlugTakenError,
  updateGrowthFunnel,
} from "@/lib/growth/funnels";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const funnel = await getGrowthFunnelForWorkspace(
    id,
    auth.ctx.vendorProfileId,
    auth.ctx.isPlatformScope,
  );
  if (!funnel) {
    return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
  }
  return NextResponse.json({ funnel });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const assignAllContacts = body?.assignAllContacts === true;
  const contactIds = Array.isArray(body?.contactIds)
    ? body.contactIds.filter((value: unknown): value is string => typeof value === "string")
    : undefined;

  if (assignAllContacts || contactIds) {
    const assigned = await assignContactsToGrowthFunnel({
      funnelId: id,
      vendorProfileId: auth.ctx.vendorProfileId,
      isPlatformScope: auth.ctx.isPlatformScope,
      allContacts: assignAllContacts,
      contactIds,
    });
    if (!assigned) {
      return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
    }

    const funnel = await getGrowthFunnelForWorkspace(
      id,
      auth.ctx.vendorProfileId,
      auth.ctx.isPlatformScope,
    );

    return NextResponse.json({ funnel, assigned: assigned.assigned });
  }

  try {
    const funnel = await updateGrowthFunnel(id, auth.ctx.vendorProfileId, auth.ctx.isPlatformScope, {
      name: typeof body?.name === "string" ? body.name : undefined,
      description:
        body?.description === null || typeof body?.description === "string"
          ? body.description
          : undefined,
      objective:
        body?.objective === null || typeof body?.objective === "string" ? body.objective : undefined,
      isActive: typeof body?.isActive === "boolean" ? body.isActive : undefined,
      assignDiscoverCheckout:
        typeof body?.assignDiscoverCheckout === "boolean" ? body.assignDiscoverCheckout : undefined,
      ctaLabel:
        body?.ctaLabel === null || typeof body?.ctaLabel === "string" ? body.ctaLabel : undefined,
      publicSlug: typeof body?.publicSlug === "string" ? body.publicSlug : undefined,
      page: body?.page,
    });

    if (!funnel) {
      return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
    }
    return NextResponse.json({ funnel });
  } catch (error) {
    if (error instanceof GrowthFunnelSlugTakenError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "That funnel URL is already taken. Choose another." },
        { status: 409 },
      );
    }
    const message = error instanceof Error ? error.message : "Could not save funnel";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const ok = await deleteGrowthFunnel(id, auth.ctx.vendorProfileId, auth.ctx.isPlatformScope);
  if (!ok) {
    return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
