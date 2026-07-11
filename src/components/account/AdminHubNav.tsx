"use client";

import { NavTileGrid } from "@/components/ui/NavTileGrid";
import { ACCOUNT_ADMIN_NAV, accountNavItemToTile } from "@/config/accountNav";

export function AdminHubNav() {
  const items = ACCOUNT_ADMIN_NAV.filter((item) => item.href !== "/account/admin").map(
    accountNavItemToTile,
  );

  return <NavTileGrid sections={[{ title: "Admin Hub", items }]} />;
}
