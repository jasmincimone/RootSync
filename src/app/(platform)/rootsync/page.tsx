import { Store, UserPlus } from "lucide-react";

import { Container } from "@/components/Container";
import { LandingCtaButtonLink, LandingCtaStack } from "@/components/LandingCtaStack";
import { PlatformFeaturesExplorer } from "@/components/PlatformFeaturesExplorer";
import { RoleCtaButton } from "@/components/RoleCtaButton";
import {
  MemberPricingSuffix,
  VendorPricingSuffix,
  VENDOR_STARTUP_PROMO_NOTICE,
} from "@/components/RoleCtaPricing";
import { ROOTSYNC_SYMBOL_SRC } from "@/config/platformExploreNav";

export const metadata = {
  title: "RootSync",
  description:
    "A local-living platform to discover, support, and participate in your community.",
};

export default function RootSyncPlatformPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="flex justify-center">
          {/* Native img preserves PNG alpha (same mark as favicon and loader). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ROOTSYNC_SYMBOL_SRC}?v=5`}
            alt="RootSync"
            width={224}
            height={224}
            decoding="async"
            className="h-44 w-44 object-contain sm:h-56 sm:w-56"
          />
        </div>

        <div className="mx-auto mt-8 max-w-3xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">RootSync</h1>
          <p className="mt-4 text-base font-medium leading-relaxed text-fix-heading sm:text-lg">
            Make local living easier, more connected, and more accessible.
          </p>
          <p className="mt-3 text-base leading-relaxed text-fix-text-muted sm:text-lg">
            A local-living platform to discover, support, and participate in your community — through
            Products, Services, Resources, Events, and conversation.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-fix-text-muted">
            Browse Discover Marketplace as a visitor. Become a Member to purchase, book Services, and
            join Pulse. Verified Vendors publish Listings for the neighborhood.
          </p>
        </div>

        <LandingCtaStack className="mt-8">
          <RoleCtaButton
            role="member"
            href="/signup"
            label="Become a Member"
            suffix={<MemberPricingSuffix />}
            icon={<UserPlus className="h-5 w-5" aria-hidden />}
            variant="cta"
            className="w-full uppercase tracking-wide"
          />
          <RoleCtaButton
            role="vendor"
            href="/account/vendor/apply"
            label="Become a Vendor"
            suffix={<VendorPricingSuffix asterisk />}
            contentLayout="stacked"
            centerInfoButton
            infoNotice={VENDOR_STARTUP_PROMO_NOTICE}
            icon={<Store className="h-5 w-5" aria-hidden />}
            variant="cta"
            className="w-full uppercase tracking-wide"
          />
          <LandingCtaButtonLink href="/about" variant="cta">
            About us
          </LandingCtaButtonLink>
        </LandingCtaStack>

        <div className="mx-auto mt-10 max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fix-text-muted">
            Explore the platform
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fix-text-muted">
            Pulse before commerce — each part of RootSync helps you discover local, support local,
            learn local, and build local relationships.
          </p>
        </div>

        <PlatformFeaturesExplorer />
      </div>
    </Container>
  );
}
