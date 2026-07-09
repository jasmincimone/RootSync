"use client";

import dynamic from "next/dynamic";

import type { DiscoverMapPin } from "@/lib/discoverMap";

const loadingClass =
  "flex items-center justify-center rounded-2xl border border-fix-border/20 bg-fix-bg-muted/60 text-sm text-fix-text-muted";

const MarketplaceMap = dynamic(
  () => import("@/components/MarketplaceMap").then((m) => m.MarketplaceMap),
  {
    ssr: false,
    loading: () => (
      <div className={`h-[420px] max-h-[55vh] ${loadingClass}`}>Loading map…</div>
    ),
  },
);

type Props = {
  pins: DiscoverMapPin[];
  compact?: boolean;
  buildDetailHref?: (pin: DiscoverMapPin) => string;
};

export function MarketplaceMapDynamic({ pins, compact, buildDetailHref }: Props) {
  return <MarketplaceMap pins={pins} compact={compact} buildDetailHref={buildDetailHref} />;
}
