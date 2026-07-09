"use client";

import { NavTileGrid } from "@/components/ui/NavTileGrid";
import { ACCOUNT_MEMBER_NAV, accountNavItemToTile } from "@/config/accountNav";

export function ActivityMoreNav() {
  const items = ACCOUNT_MEMBER_NAV.filter(
    (item) =>
      item.href.startsWith("/messages/inbox") || item.href.startsWith("/account/pulses"),
  ).map(accountNavItemToTile);

  return (
    <NavTileGrid
      sections={[
        {
          title: "More",
          items,
        },
      ]}
    />
  );
}
