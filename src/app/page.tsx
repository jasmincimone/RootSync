import Link from "next/link";
import { Leaf } from "lucide-react";

import { Container } from "@/components/Container";
import { FeaturedListingCard } from "@/components/FeaturedListingCard";
import { ButtonLink } from "@/components/ui/Button";
import { AMARA_KIT_CATALOG_ID } from "@/config/featuredCatalog";
import { getMergedProductForPublic } from "@/lib/shopCatalog";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS, VENDOR_STATUS } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [amaraKit, vendorsRaw] = await Promise.all([
    getMergedProductForPublic(AMARA_KIT_CATALOG_ID),
    prisma.vendorProfile.findMany({
      where: { status: VENDOR_STATUS.APPROVED },
      include: {
        listings: {
          where: { status: LISTING_STATUS.PUBLISHED },
          select: { id: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
  ]);

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
              <p>A Marketplace for Self-Sufficiency. A Platform for Connection.</p>
              <p>
                Discover local vendors on the marketplace, connect on RootSync, and grow with a
                network of creators and communities.
              </p>
            </div>
            <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
              <ButtonLink href="/marketplace" variant="cta" size="lg" className="uppercase tracking-wide">
                👉 🌐 Explore the Marketplace
              </ButtonLink>
              <ButtonLink href="/rootsync" variant="secondary" size="lg" className="uppercase tracking-wide">
                👉 Enter RootSync Platform
              </ButtonLink>
              <ButtonLink
                href={`/products/${AMARA_KIT_CATALOG_ID}`}
                variant="secondary"
                size="lg"
                className="uppercase tracking-wide"
              >
                👉 🌱✅ Buy The Amara Roots Sprout Check Kit
              </ButtonLink>
              {amaraKit ? <FeaturedListingCard product={amaraKit} /> : null}
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
                  Meet vendors on the marketplace — from urban gardening and self-care to preparedness
                  and handmade goods.
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
                      href={`/marketplace/vendors/${vendor.id}`}
                      className="rounded-2xl border border-clay/25 bg-clay/10 px-4 py-4 text-center text-sm font-semibold text-clay transition-all hover:border-gold/50 hover:bg-clay/15"
                    >
                      {vendor.displayName}
                    </Link>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Link href="/marketplace" className="text-sm font-medium text-gold hover:underline">
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
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-fix-border/15 bg-fix-surface p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-fix-heading">RootSync platform</h2>
              <p className="mt-2 text-sm leading-relaxed text-fix-text-muted">
                Community, courses, messaging, and your AI growing assistant — all in one place.
              </p>
              <div className="mt-4">
                <ButtonLink href="/rootsync" variant="secondary" size="sm">
                  Enter RootSync
                </ButtonLink>
              </div>
            </div>
            <div className="rounded-2xl border border-fix-border/15 bg-fix-surface p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-fix-heading">Marketplace</h2>
              <p className="mt-2 text-sm leading-relaxed text-fix-text-muted">
                Shop with approved local vendors and support makers in your region.
              </p>
              <div className="mt-4">
                <ButtonLink href="/marketplace" variant="secondary" size="sm">
                  Browse marketplace
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
