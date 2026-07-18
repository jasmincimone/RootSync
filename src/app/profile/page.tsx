import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { communityAuthorSelect, publicProfileHref } from "@/lib/userProfileDisplay";

/** Canonical self-profile entry — Vendor storefront or Member profile. */
export default async function ProfileRedirectPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: communityAuthorSelect,
  });
  if (!user) {
    redirect("/account");
  }

  redirect(publicProfileHref(user));
}
