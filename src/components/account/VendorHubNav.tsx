"use client";

import { ExternalLink } from "lucide-react";

import { NavTileGrid } from "@/components/ui/NavTileGrid";
import { ACCOUNT_VENDOR_NAV, accountNavItemToTile } from "@/config/accountNav";
import type { NavTileItem } from "@/components/ui/NavTile";

type Props = {
  publicPageHref?: string;
};

export function VendorHubNav({ publicPageHref }: Props) {
  const items: NavTileItem[] = ACCOUNT_VENDOR_NAV.filter((item) => item.href !== "/account/vendor").map(
    accountNavItemToTile,
  );

  if (publicPageHref) {
    items.push({
      href: publicPageHref,
      label: "Public page",
      description: "View on Discover",
      icon: ExternalLink,
      fullWidth: true,
    });
  }

  return <NavTileGrid sections={[{ title: "Vendor tools", items }]} />;
}
