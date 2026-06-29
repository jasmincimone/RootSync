import Link from "next/link";
import { Globe, Leaf, Store, UserPlus } from "lucide-react";

import { Container } from "@/components/Container";
import { RoleCtaButton } from "@/components/RoleCtaButton";
import { ButtonLink } from "@/components/ui/Button";
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
                RootSync brings together Discover, community, and messaging — so you can find
                vendors, book services, and grow with creators near you.
              </p>
            </div>
            <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
              <ButtonLink href="/rootsync" variant="cta" size="lg" className="uppercase tracking-wide">
                <Globe className="h-5 w-5" aria-hidden />
                Enter RootSync Platform
              </ButtonLink>
              <RoleCtaButton
                role="member"
                href="/login?callbackUrl=/account"
                label="Become a Member"
                icon={<UserPlus className="h-5 w-5" aria-hidden />}
                variant="secondary"
                className="uppercase tracking-wide"
              />
              <RoleCtaButton
                role="vendor"
                href="/account/vendor/apply"
                label="Become a Vendor"
                icon={<Store className="h-5 w-5" aria-hidden />}
                variant="secondary"
                className="uppercase tracking-wide"
              />
            </div>
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
            <div className="mx-auto mt-14 w-full min-w-0 max-w-4xl overflow-hidden rounded-2xl bg-espresso shadow-soft ring-1 ring-fix-border/10 sm:mt-16">
              <div className="flex flex-col items-center px-6 py-10 text-clay sm:py-12">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold/60">
                  <Leaf className="h-8 w-8 text-gold" aria-hidden />
                </span>
                <div className="mt-4 text-center">
                  <div className="text-2xl font-bold tracking-tight sm:text-3xl">THE FIX</div>
                  <div className="mx-auto mt-1 h-px w-12 bg-gold/50" />
                  <div className="mt-1 text-lg font-medium tracking-wide text-clay/90">COLLECTIVE</div>
                </div>
                <p className="mx-auto mt-6 max-w-lg text-center text-sm leading-relaxed text-clay/85 sm:text-base">
                  Meet vendors on Discover — from urban gardening and self-care to preparedness and
                  handmade goods.
                </p>
              </div>
              <div className="border-t border-clay/10 px-4 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8">
                <p className="text-center text-xs font-semibold uppercase tracking-wider text-clay/70">
                  Featured vendors
                </p>
                <div className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
                  {featuredVendors.map((vendor) => (
                    <Link
                      key={vendor.id}
                      href={discoverVendorPath(vendor.id)}
                      className="rounded-2xl border border-clay/25 bg-clay/10 px-4 py-4 text-center text-sm font-semibold text-clay transition-all hover:border-gold/50 hover:bg-clay/15"
                    >
                      {vendor.displayName}
                    </Link>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Link href="/discover" className="text-sm font-medium text-gold hover:underline">
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
                Community, messaging, AI tools, and Discover Marketplace — shop local goods, book
                services, and connect with makers in your region, all from one place.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ButtonLink href="/rootsync" variant="cta" size="sm">
                  Enter RootSync
                </ButtonLink>
                <ButtonLink href="/discover" variant="secondary" size="sm">
                  Browse Discover
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
