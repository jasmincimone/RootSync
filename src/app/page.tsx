import Link from "next/link";
import { Globe, Store, UserPlus } from "lucide-react";

import { Container } from "@/components/Container";
import { LandingCtaButtonLink, LandingCtaStack } from "@/components/LandingCtaStack";
import { RoleCtaButton } from "@/components/RoleCtaButton";
import { MemberPricingSuffix, VendorPricingSuffix, VENDOR_STARTUP_PROMO_NOTICE } from "@/components/RoleCtaPricing";
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
      <section className="border-b border-fix-border/15 bg-fix-bg-muted/40">
        <Container className="py-14 sm:py-20">
          <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col items-center text-center">
            <h1 className="text-3xl font-bold tracking-tight text-fix-heading sm:text-4xl md:text-5xl">
              Stay Synced!
            </h1>
            <div className="mt-5 max-w-xl space-y-4 text-base leading-relaxed text-fix-text">
              <p>A platform for self-sufficiency, connection, and local commerce.</p>
              <p>
                RootSync brings together Discover Marketplace, Pulse, and Stay Synced — so you can
                find vendors, book services, and grow with creators near you.
              </p>
            </div>
            <LandingCtaStack className="mt-8">
              <LandingCtaButtonLink href="/rootsync" variant="cta">
                <Globe className="h-5 w-5" aria-hidden />
                Enter RootSync Platform
              </LandingCtaButtonLink>
              <RoleCtaButton
                role="member"
                href="/login?callbackUrl=/account"
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
            </LandingCtaStack>
          </div>

          <div className="mx-auto mt-12 w-full max-w-lg sm:mt-14">
            <div className="overflow-hidden rounded-2xl bg-fix-surface ring-1 ring-fix-border/15 shadow-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/home/hero-product-lineup.png"
                alt="THE FIX SELF-CARE CO. products—teas, soaps, balms, and survival kits—arranged on a rustic wooden wooden table with soft leaf shadows."
                width={1200}
                height={1800}
                className="block h-auto w-full object-cover"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>

          {featuredVendors.length > 0 ? (
            <div className="mx-auto mt-14 w-full min-w-0 max-w-4xl overflow-hidden rounded-2xl bg-warm-brown shadow-soft ring-1 ring-fix-border/10 sm:mt-16">
              <div className="flex flex-col items-center px-6 py-10 text-clay-muted sm:py-12">
                {/* Native img preserves PNG alpha in the infinity loops. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${ROOTSYNC_SYMBOL_SRC}?v=6`}
                  alt="RootSync"
                  width={56}
                  height={56}
                  className="h-14 w-14 object-contain"
                  decoding="async"
                />
                <div className="mt-4 text-center">
                  <div className="text-2xl font-bold tracking-tight sm:text-3xl">RootSync</div>
                </div>
                <p className="mx-auto mt-6 max-w-lg text-center text-sm leading-relaxed text-clay-muted/90 sm:text-base">
                  Meet vendors on Discover Marketplace — from urban gardening and self-care to
                  preparedness and handmade goods.
                </p>
              </div>
              <div className="border-t border-gold/15 px-4 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8">
                <p className="text-center text-xs font-semibold uppercase tracking-wider text-clay-muted/80">
                  Featured vendors
                </p>
                <div className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
                  {featuredVendors.map((vendor) => (
                    <Link
                      key={vendor.id}
                      href={discoverVendorPath(vendor)}
                      className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-4 text-center text-sm font-semibold text-clay-muted transition-all hover:border-gold/50 hover:bg-gold/15"
                    >
                      {vendor.displayName}
                    </Link>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Link href="/discover" className="text-sm font-medium text-clay-muted hover:underline">
                    View all vendors →
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </Container>
      </section>

      <section>
        <Container className="py-12 sm:py-16">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl border border-fix-border/15 bg-fix-surface p-6 shadow-soft sm:p-8">
              <h2 className="text-lg font-semibold text-fix-heading">RootSync platform</h2>
              <p className="mt-2 text-sm leading-relaxed text-fix-text-muted">
                Pulse, Stay Synced, RootSense AI, and Discover Marketplace — shop local goods, book
                services, and connect with makers in your region, all from one place.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ButtonLink href="/rootsync" variant="cta" size="sm">
                  Enter RootSync
                </ButtonLink>
                <ButtonLink href="/discover" variant="secondary" size="sm">
                  Browse Discover Marketplace
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
