import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { loadPendingVendorReviews } from "@/lib/pulse/vendorReviews";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await loadPendingVendorReviews(session.user.id);
  return NextResponse.json({ pending });
}
