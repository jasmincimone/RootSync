"use client";

import dynamic from "next/dynamic";

import type { MarketplaceMapVendor } from "@/components/MarketplaceMap";

const loadingClass =
  "flex items-center justify-center rounded-2xl border border-fix-border/20 bg-fix-bg-muted/60 text-sm text-fix-text-muted";

const loadMap = () => import("@/components/MarketplaceMap").then((m) => m.MarketplaceMap);

const MarketplaceMap = dynamic(loadMap, {
  ssr: false,
  loading: () => (
    <div className={`h-[420px] max-h-[55vh] ${loadingClass}`}>Loading map…</div>
  ),
});

const MarketplaceMapCompact = dynamic(loadMap, {
  ssr: false,
  loading: () => (
    <div className={`h-[280px] max-h-[40vh] ${loadingClass}`}>Loading map…</div>
  ),
});

type Props = {
  vendors: MarketplaceMapVendor[];
  compact?: boolean;
};

export function MarketplaceMapDynamic({ vendors, compact }: Props) {
  if (compact) {
    return <MarketplaceMapCompact vendors={vendors} />;
  }
  return <MarketplaceMap vendors={vendors} />;
}
