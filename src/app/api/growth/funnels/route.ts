import { NextRequest, NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import { createGrowthFunnel, GrowthFunnelSlugTakenError, listGrowthFunnels } from "@/lib/growth/funnels";
import { Prisma } from "@prisma/client";

export async function GET() {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const funnels = await listGrowthFunnels(auth.ctx.vendorProfileId, auth.ctx.isPlatformScope);
  return NextResponse.json({ funnels });
}

export async function POST(request: NextRequest) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const funnel = await createGrowthFunnel({
      vendorProfileId: auth.ctx.vendorProfileId,
      name,
      description: typeof body?.description === "string" ? body.description : null,
      objective: typeof body?.objective === "string" ? body.objective : null,
      ctaLabel: typeof body?.ctaLabel === "string" ? body.ctaLabel : null,
      publicSlug: typeof body?.publicSlug === "string" ? body.publicSlug : null,
      page: body?.page,
    });
    return NextResponse.json({ funnel }, { status: 201 });
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
