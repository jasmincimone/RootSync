import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { DIRECTORY_CLAIM_STATUS } from "@/lib/roles";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [pending, directoryClaims] = await Promise.all([
    prisma.vendorProfile.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.directoryListing.findMany({
      where: { claimStatus: DIRECTORY_CLAIM_STATUS.PENDING },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        claimRequestedAt: true,
        claimRequestedBy: {
          select: {
            id: true,
            email: true,
            name: true,
            vendorProfile: { select: { id: true, status: true, displayName: true } },
          },
        },
      },
      orderBy: { claimRequestedAt: "asc" },
    }),
  ]);

  return NextResponse.json({ vendors: pending, directoryClaims });
}
