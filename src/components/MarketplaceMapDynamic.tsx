"use client";

import dynamic from "next/dynamic";

import type { MarketplaceMapVendor } from "@/components/MarketplaceMap";

const loadingClass =
  "flex items-center justify-center rounded-2xl border border-fix-border/20 bg-fix-bg-muted/60 text-sm text-fix-text-muted";

const MarketplaceMap = dynamic(
  () => import("@/components/MarketplaceMap").then((m) => m.MarketplaceMap),
  {
    ssr: false,
    loading: () => (
      <div className={`h-[420px] max-h-[55vh] ${loadingClass}`}>Loading map…</div>
    ),
  }
);

type Props = {
  vendors: MarketplaceMapVendor[];
  compact?: boolean;
};

export function MarketplaceMapDynamic({ vendors, compact }: Props) {
  if (compact) {
    return (
      <MarketplaceMap vendors={vendors} compact />
    );
  }
  return <MarketplaceMap vendors={vendors} />;
}
