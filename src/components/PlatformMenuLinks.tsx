"use client";

import { NavTileGrid } from "@/components/ui/NavTileGrid";
import { MENU_QUICK_TILES, PLATFORM_MENU_TILES } from "@/config/platformMenuNav";

type Props = {
  onNavigate?: () => void;
};

export function PlatformMenuLinks({ onNavigate }: Props) {
  return (
    <NavTileGrid
      onNavigate={onNavigate}
      sections={[
        { title: "Explore", items: MENU_QUICK_TILES },
        { title: "Platform", items: PLATFORM_MENU_TILES },
      ]}
    />
  );
}
