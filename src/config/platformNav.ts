/** Shared labels for header + /menu + footer (single source of truth). */
export type PlatformNavLink = {
  href: string;
  label: string;
  description?: string;
  /** Shown in nav; page still exists with a coming-soon experience. */
  comingSoon?: boolean;
  /** Use Pulse brand icon instead of Lucide in tile grids */
  usePulseIcon?: boolean;
};

/** Primary platform navigation — desktop header and mobile menu. */
export const PLATFORM_PRIMARY_NAV_LINKS: PlatformNavLink[] = [
  {
    href: "/discover",
    label: "Discover Marketplace",
    description: "Find local vendors, products, and opportunities",
  },
  {
    href: "/rootsyncai",
    label: "RootSync AI",
    description: "Your intelligent Grow Partner",
  },
  {
    href: "/messages/inbox",
    label: "Stay Synced",
    description: "Build relationships through conversation",
  },
  {
    href: "/pulse",
    label: "Pulse",
    description: "The living heartbeat of RootSync",
    usePulseIcon: true,
  },
];

/** @deprecated Use PLATFORM_PRIMARY_NAV_LINKS */
export const PLATFORM_NAV_LINKS: PlatformNavLink[] = [
  { href: "/rootsync", label: "RootSync" },
  ...PLATFORM_PRIMARY_NAV_LINKS,
];

/** @deprecated Use PLATFORM_PRIMARY_NAV_LINKS */
export const PLATFORM_HEADER_ROOTSYNC_MENU_LINKS: PlatformNavLink[] = PLATFORM_PRIMARY_NAV_LINKS;

export const PLATFORM_FOOTER_LINKS: PlatformNavLink[] = [
  { href: "/about", label: "About us" },
  { href: "/rootsync", label: "RootSync platform" },
  { href: "/discover", label: "Discover Marketplace" },
  { href: "/pulse", label: "Pulse" },
  { href: "/rootsyncai", label: "RootSync AI" },
  { href: "/messages/inbox", label: "Stay Synced" },
];

export function isPlatformHeaderRootsyncSectionActive(pathname: string): boolean {
  return isPlatformPrimaryNavActive(pathname) || pathname.startsWith("/rootsync");
}

export function isPlatformPrimaryNavActive(pathname: string): boolean {
  if (pathname.startsWith("/rootsyncai")) return true;
  if (pathname.startsWith("/discover") || pathname.startsWith("/marketplace")) return true;
  if (pathname.startsWith("/pulse") || pathname.startsWith("/community")) return true;
  if (pathname.startsWith("/messages")) return true;
  return false;
}

export function isPlatformDiscoverActive(pathname: string): boolean {
  return pathname === "/discover" || pathname.startsWith("/discover/");
}

/** @deprecated Use isPlatformDiscoverActive */
export function isPlatformMarketplaceActive(pathname: string): boolean {
  return isPlatformDiscoverActive(pathname) || pathname.startsWith("/marketplace");
}

/** Stay Synced — formerly Messages */
export const STAY_SYNCED_HREF = "/messages/inbox";

/** Pulse feed — formerly Community */
export const PULSE_HREF = "/pulse";
