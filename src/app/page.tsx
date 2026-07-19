import Link from "next/link";
import { Store, UserPlus } from "lucide-react";

import { Container } from "@/components/Container";
import { LandingCtaStack } from "@/components/LandingCtaStack";
import { RoleCtaButton } from "@/components/RoleCtaButton";
import {
  MemberPricingSuffix,
  VendorPricingSuffix,
  VENDOR_STARTUP_PROMO_NOTICE,
} from "@/components/RoleCtaPricing";
import { ButtonLink } from "@/components/ui/Button";
import { ROOTSYNC_SYMBOL_SRC } from "@/config/platformExploreNav";
import { discoverVendorPath } from "@/config/discoverPaths";
import { publicListingRelationWhere } from "@/lib/offeringListing";
import { prisma } from "@/lib/prisma";
import { VENDOR_STATUS } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const vendorsRaw = await prisma.vendorProfile.findMany({
    where: { status: VENDOR_STATUS.APPROVED },
    include: {
      listings: {
        where: publicListingRelationWhere,
        select: { id: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  const featuredVendors = [...vendorsRaw]
    .sort((a, b) => b.listings.length - a.listings.length)
    .slice(0, 4);

  return (
    <div>
      {/* Hero: one composition — brand, one line, one CTA, full-bleed image */}
      <section
        className="relative isolate min-h-[min(92dvh,52rem)] overflow-hidden bg-warm-brown"
        aria-label="RootSync"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/home/hero-product-lineup.png"
          alt="Local RootSync products—teas, soaps, balms, and survival kits—arranged on a rustic wooden table."
          width={1200}
          height={1800}
          className="home-hero-media absolute inset-0 h-full w-full object-cover object-[center_30%] sm:object-center"
          fetchPriority="high"
          decoding="async"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-espresso/90 via-espresso/45 to-espresso/20"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-espresso/50 via-transparent to-transparent"
          aria-hidden
        />

        <Container className="relative z-10 flex min-h-[min(92dvh,52rem)] flex-col justify-end pb-12 pt-24 sm:pb-16 sm:pt-28">
          <div className="home-hero-copy max-w-xl text-clay">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${ROOTSYNC_SYMBOL_SRC}?v=6`}
              alt=""
              width={64}
              height={64}
              className="h-14 w-14 object-contain sm:h-16 sm:w-16"
              decoding="async"
              aria-hidden
            />
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-clay sm:text-5xl md:text-6xl">
              RootSync
            </h1>
            <p className="mt-3 font-handwriting text-2xl leading-snug text-clay sm:text-3xl">
              Make local living easier.
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-clay/90 sm:text-lg">
              Find local vendors, book services, and grow with your neighborhood.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
              <ButtonLink
                href="/discover"
                variant="cta"
                size="lg"
                className="min-h-11 px-6 uppercase tracking-wide"
              >
                Explore Discover
              </ButtonLink>
              <Link
                href="/rootsync"
                className="text-sm font-medium text-clay/85 underline-offset-4 transition-colors hover:text-clay hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-espresso"
              >
                How the platform works
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {featuredVendors.length > 0 ? (
        <section className="border-b border-fix-border/15 bg-fix-bg" aria-labelledby="home-vendors-heading">
          <Container className="py-14 sm:py-16">
            <div className="mx-auto max-w-3xl text-center">
              <h2
                id="home-vendors-heading"
                className="text-2xl font-semibold tracking-tight text-fix-heading sm:text-3xl"
              >
                Featured vendors
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-fix-text-muted sm:text-base">
                Meet makers on Discover — from urban gardening and self-care to preparedness and
                handmade goods.
              </p>
            </div>
            <ul className="home-section-rise mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
              {featuredVendors.map((vendor) => (
                <li key={vendor.id}>
                  <Link
                    href={discoverVendorPath(vendor)}
                    className="flex min-h-14 items-center justify-center rounded-2xl bg-warm-brown px-4 py-4 text-center text-sm font-semibold text-clay transition-colors hover:bg-bark focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2"
                  >
                    {vendor.displayName}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 text-center">
              <Link
                href="/discover"
                className="text-sm font-medium text-fix-link hover:text-fix-link-hover hover:underline"
              >
                View all on Discover →
              </Link>
            </div>
          </Container>
        </section>
      ) : null}

      <section className="bg-fix-bg-muted/40" aria-labelledby="home-join-heading">
        <Container className="py-14 sm:py-16">
          <div className="mx-auto max-w-xl text-center">
            <h2
              id="home-join-heading"
              className="text-2xl font-semibold tracking-tight text-fix-heading sm:text-3xl"
            >
              Join RootSync
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-fix-text-muted sm:text-base">
              Browse as a visitor. Become a Member to buy, book, and Pulse. Verified Vendors list
              what they offer locally.
            </p>
          </div>
          <LandingCtaStack className="home-section-rise mt-8">
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
              variant="secondary"
              className="w-full uppercase tracking-wide"
            />
          </LandingCtaStack>
        </Container>
      </section>
    </div>
  );
}
