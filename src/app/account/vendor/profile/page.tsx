import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { discoverVendorPath } from "@/config/discoverPaths";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { VendorProfileForm } from "@/components/VendorProfileForm";
import { VendorShopCarouselForm } from "@/components/VendorShopCarouselForm";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { VENDOR_STATUS } from "@/lib/roles";
import { loadVendorCarousel } from "@/lib/vendorCarousel";

export default async function VendorProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/vendor/profile");
  }

  const profile = await prisma.vendorProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    redirect("/account/vendor/apply");
  }

  const mediaCarousel = await loadVendorCarousel(profile.id);
  const canEditCarousel = profile.status === VENDOR_STATUS.APPROVED;

  return (
    <AccountSubpageBody description="Marketplace profile and carousel for your public vendor page.">
      <ButtonLink href={discoverVendorPath(profile)} variant="secondary" size="sm">
        View my vendor page
      </ButtonLink>
      <Card className="p-6">
        <VendorProfileForm
          initial={{
            displayName: profile.displayName,
            publicSlug: profile.publicSlug,
            profileImageUrl: profile.profileImageUrl,
            bio: profile.bio,
            contactEmail: profile.contactEmail,
            pickupLocation: profile.pickupLocation,
            website: profile.website,
            latitude: profile.latitude,
            longitude: profile.longitude,
          }}
        />
      </Card>

      <Card className="p-6">
        <VendorShopCarouselForm
          initial={{
            canEdit: canEditCarousel,
            vendorProfileId: profile.id,
            shopName: profile.displayName,
            publicUrl: discoverVendorPath(profile),
            mediaCarousel,
          }}
        />
      </Card>
    </AccountSubpageBody>
  );
}
