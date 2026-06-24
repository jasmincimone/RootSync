import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { VendorProfileForm } from "@/components/VendorProfileForm";
import { VendorShopCarouselForm } from "@/components/VendorShopCarouselForm";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-fix-heading">Vendor profile</h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          Marketplace profile and carousel for your public vendor page.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <ButtonLink href={`/marketplace/vendors/${profile.id}`} variant="secondary" size="sm">
            View my vendor page
          </ButtonLink>
        </div>
      </div>
      <Card className="p-6">
        <VendorProfileForm
          initial={{
            displayName: profile.displayName,
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
        <VendorShopCarouselForm />
      </Card>
    </div>
  );
}
