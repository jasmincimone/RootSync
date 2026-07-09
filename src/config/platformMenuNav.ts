import type { NavTileItem } from "@/components/ui/NavTile";
import { PLATFORM_EXPLORE_ITEMS } from "@/config/platformExploreNav";
import { PLATFORM_PRIMARY_NAV_LINKS } from "@/config/platformNav";

/** RootSync community mark — Home menu icon (figures + RootSync wordmark). */
export const ROOTSYNC_HOME_LOGO_SRC = "/images/brand/rootsync-home-logo.png?v=3";

/** Infinity symbol — RootSync platform menu icon (also site favicon mark). */
export const ROOTSYNC_PLATFORM_SYMBOL_SRC = "/images/brand/rootsync-platform-symbol.png";

export const MENU_QUICK_TILES: NavTileItem[] = [
  {
    href: "/",
    label: "Home",
    description: "RootSync home",
    iconImageSrc: ROOTSYNC_HOME_LOGO_SRC,
  },
  {
    href: "/rootsync",
    label: "RootSync",
    description: "Platform overview",
    iconImageSrc: ROOTSYNC_PLATFORM_SYMBOL_SRC,
  },
];

const exploreIconByHref = Object.fromEntries(
  PLATFORM_EXPLORE_ITEMS.map((item) => [item.href, item.iconSrc]),
);

/** Four platform modules — strict 2×2 grid (no full-width rows). */
export const PLATFORM_MENU_TILES: NavTileItem[] = PLATFORM_PRIMARY_NAV_LINKS.map((link) => {
  const explore = PLATFORM_EXPLORE_ITEMS.find((e) => e.href === link.href);
  return {
    href: link.href,
    label: link.label,
    description: link.description ?? explore?.tagline ?? "",
    iconImageSrc: link.usePulseIcon ? undefined : exploreIconByHref[link.href],
    usePulseIcon: link.usePulseIcon,
  };
});
