import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { pulsePostErrorFromUnknown } from "@/lib/pulsePostValidation";
import { prisma } from "@/lib/prisma";
import { PULSE_POST_STATUS } from "@/lib/roles";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  try {
    const drafts = await prisma.communityPost.findMany({
      where: {
        authorId: session.user.id,
        status: PULSE_POST_STATUS.DRAFT,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        content: true,
        mediaJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ drafts });
  } catch (e) {
    console.error("[pulse drafts] error:", e);
    return NextResponse.json(pulsePostErrorFromUnknown(e), { status: 500 });
  }
}
