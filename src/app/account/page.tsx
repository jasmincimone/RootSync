import { getServerSession } from "next-auth";

import { AccountFtueChecklist } from "@/components/AccountFtueChecklist";
import { AccountHubExplorer } from "@/components/account/AccountHubExplorer";
import { AccountProfileCard } from "@/components/account/AccountProfileCard";
import { PageBody } from "@/components/ui/PageBody";
import { discoverVendorPath } from "@/config/discoverPaths";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      imageUrl: true,
      vendorProfile: {
        select: {
          id: true,
          publicSlug: true,
          displayName: true,
          profileImageUrl: true,
          status: true,
        },
      },
    },
  });

  const displayName =
    user?.vendorProfile?.displayName ?? user?.name?.trim() ?? session.user.email ?? "Your account";
  const imageUrl = user?.vendorProfile?.profileImageUrl ?? user?.imageUrl;
  const profileHref = user?.vendorProfile?.id
    ? discoverVendorPath({
        id: user.vendorProfile.id,
        publicSlug: user.vendorProfile.publicSlug,
      })
    : `/members/${user?.id ?? session.user.id}`;

  return (
    <PageBody>
      <AccountProfileCard
        displayName={displayName}
        imageUrl={imageUrl}
        profileHref={profileHref}
      />

      <AccountFtueChecklist />

      <AccountHubExplorer />
    </PageBody>
  );
}
