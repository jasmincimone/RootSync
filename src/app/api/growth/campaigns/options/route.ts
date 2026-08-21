import { NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import { listCampaignDestinations } from "@/lib/growth/campaignDestinations";
import { listGrowthContacts } from "@/lib/growth/contacts";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;

  const [destinations, contacts, vendor] = await Promise.all([
    listCampaignDestinations({
      vendorProfileId: auth.ctx.vendorProfileId,
      isPlatformScope: auth.ctx.isPlatformScope,
    }),
    listGrowthContacts(auth.ctx.vendorProfileId, auth.ctx.isPlatformScope),
    auth.ctx.vendorProfileId
      ? prisma.vendorProfile.findUnique({
          where: { id: auth.ctx.vendorProfileId },
          select: { displayName: true, contactEmail: true },
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    destinations,
    vendor: {
      displayName: vendor?.displayName ?? "RootSync",
      contactEmail: vendor?.contactEmail ?? null,
    },
    contacts: contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      status: contact.status,
      marketingOptIn: contact.marketingOptIn === true,
    })),
  });
}
