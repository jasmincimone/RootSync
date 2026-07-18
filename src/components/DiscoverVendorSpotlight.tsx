"use client";

import Link from "next/link";

import type { DiscoverVendorRow } from "@/components/DiscoverBrowse";
import { DiscoverCollapsibleSection } from "@/components/DiscoverCollapsibleSection";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedVendorBadge } from "@/components/VerifiedVendorBadge";
import { Card } from "@/components/ui/Card";
import { rememberDiscoverResults } from "@/lib/discoverReturn";
import { discoverVendorPath } from "@/config/discoverPaths";

type VendorWithDistance = DiscoverVendorRow & { distanceMiles?: number };

type Props = {
  topByPulse: DiscoverVendorRow[];
  nearby: VendorWithDistance[];
  discoverResultsHref: string;
  buildDetailHref: (
    detailPath: string,
    kind: "vendor" | "directory" | "listing",
    id: string,
  ) => string;
  locationSummary: string | null;
  defaultOpen?: boolean;
};

function VendorSpotlightCard({
  vendor,
  href,
  onNavigate,
  meta,
}: {
  vendor: DiscoverVendorRow;
  href: string;
  onNavigate: () => void;
  meta?: string | null;
}) {
  return (
    <Card id={`discover-spotlight-${vendor.id}`} className="h-full p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <UserAvatar
          src={vendor.profileImageUrl}
          name={vendor.displayName}
          size="lg"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={href}
              onClick={onNavigate}
              className="min-w-0 truncate text-sm font-semibold text-fix-heading hover:text-fix-link hover:underline"
            >
              {vendor.displayName}
            </Link>
            <span className="select-none text-sm text-fix-text-muted/45" aria-hidden>
              |
            </span>
            <VerifiedVendorBadge size="sm" className="shrink-0" />
          </div>
          {meta ? <p className="mt-1 text-xs text-fix-text-muted">{meta}</p> : null}
          {vendor.pickupLocation ? (
            <p className="mt-1 text-xs text-fix-text-muted">{vendor.pickupLocation}</p>
          ) : null}
        </div>
      </div>
      {vendor.bio ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-fix-text-muted">{vendor.bio}</p>
      ) : (
        <p className="mt-3 text-sm text-fix-text-muted">
          {vendor.listingsCount} published listing{vendor.listingsCount === 1 ? "" : "s"}
        </p>
      )}
    </Card>
  );
}

function formatMiles(miles: number | undefined): string | null {
  if (miles == null || !Number.isFinite(miles)) return null;
  if (miles < 10) return `${miles.toFixed(1)} mi away`;
  return `${Math.round(miles)} mi away`;
}

export function DiscoverVendorSpotlight({
  topByPulse,
  nearby,
  discoverResultsHref,
  buildDetailHref,
  locationSummary,
  defaultOpen = true,
}: Props) {
  if (topByPulse.length === 0 && nearby.length === 0) return null;

  const rememberResults = () => rememberDiscoverResults(discoverResultsHref);

  return (
    <div className="space-y-2" aria-label="Vendor spotlights">
      {topByPulse.length > 0 ? (
        <DiscoverCollapsibleSection
          id="discover-top-pulse-vendors"
          title="Top in the community"
          description="Vendors with the highest Pulse scores — contributing the most across RootSync."
          count={topByPulse.length}
          defaultOpen={defaultOpen}
        >
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topByPulse.map((v) => (
              <li key={`pulse-${v.id}`}>
                <VendorSpotlightCard
                  vendor={v}
                  href={buildDetailHref(discoverVendorPath(v), "vendor", v.id)}
                  onNavigate={rememberResults}
                  meta={
                    (v.pulseScore ?? 0) > 0
                      ? `Pulse score ${v.pulseScore}`
                      : "Building their Pulse"
                  }
                />
              </li>
            ))}
          </ul>
        </DiscoverCollapsibleSection>
      ) : null}

      {nearby.length > 0 ? (
        <DiscoverCollapsibleSection
          id="discover-nearby-vendors"
          title="Closest to you"
          description={
            <>
              Top vendors nearest your search location
              {locationSummary ? ` · ${locationSummary}` : ""}.
            </>
          }
          count={nearby.length}
          defaultOpen={defaultOpen}
        >
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {nearby.map((v) => (
              <li key={`near-${v.id}`}>
                <VendorSpotlightCard
                  vendor={v}
                  href={buildDetailHref(discoverVendorPath(v), "vendor", v.id)}
                  onNavigate={rememberResults}
                  meta={formatMiles(v.distanceMiles)}
                />
              </li>
            ))}
          </ul>
        </DiscoverCollapsibleSection>
      ) : null}
    </div>
  );
}
