import Image from "next/image";
import { Store, UserPlus } from "lucide-react";

import { Container } from "@/components/Container";
import { PlatformFeaturesExplorer } from "@/components/PlatformFeaturesExplorer";
import { RoleCtaButton } from "@/components/RoleCtaButton";
import { ButtonLink } from "@/components/ui/Button";

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
          <Image
            src="/images/platform/rootsync/logo.png"
            alt="RootSync"
            width={280}
            height={280}
            className="h-44 w-44 rounded-full object-cover sm:h-56 sm:w-56"
            priority
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
            Browse Discover as a visitor. Become a Member to purchase, book Services, and join
            Community. Verified Vendors publish Listings for the neighborhood.
          </p>
        </div>

        <div className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-3">
          <RoleCtaButton
            role="member"
            href="/signup"
            label="Become a Member"
            icon={<UserPlus className="h-5 w-5" aria-hidden />}
          />
          <RoleCtaButton
            role="vendor"
            href="/account/vendor/apply"
            label="Become a Vendor"
            icon={<Store className="h-5 w-5" aria-hidden />}
          />
          <ButtonLink href="/about" variant="secondary" size="lg" className="uppercase tracking-wide">
            About us
          </ButtonLink>
        </div>

        <div className="mx-auto mt-10 max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fix-text-muted">
            Explore the platform
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fix-text-muted">
            Community before commerce — each part of RootSync helps you discover local, support
            local, learn local, and build local relationships.
          </p>
        </div>

        <PlatformFeaturesExplorer />
      </div>
    </Container>
  );
}
