/** Shared labels for header + /menu + footer (single source of truth). */
export type PlatformNavLink = {
  href: string;
  label: string;
  /** Shown in nav; page still exists with a coming-soon experience. */
  comingSoon?: boolean;
};

/** Mobile /menu links (Discover lives under RootSync, not as a peer). */
export const PLATFORM_NAV_LINKS: PlatformNavLink[] = [
  { href: "/rootsync", label: "RootSync" },
  { href: "/discover", label: "Discover" },
  { href: "/rootsyncai", label: "RootSync AI" },
  { href: "/messages/inbox", label: "Messages" },
  { href: "/community", label: "Community" },
];

/** Desktop RootSync dropdown — discover is part of the platform, not a top-level header item. */
export const PLATFORM_HEADER_ROOTSYNC_MENU_LINKS: PlatformNavLink[] = [
  { href: "/discover", label: "Discover" },
  { href: "/community", label: "Community" },
  { href: "/rootsyncai", label: "RootSync AI" },
  { href: "/messages/inbox", label: "Messages" },
];

export const PLATFORM_FOOTER_LINKS: PlatformNavLink[] = [
  { href: "/about", label: "About us" },
  { href: "/rootsync", label: "RootSync platform" },
  { href: "/discover", label: "Discover" },
  { href: "/community", label: "Community" },
  { href: "/rootsyncai", label: "RootSync AI" },
];

export function isPlatformHeaderRootsyncSectionActive(pathname: string): boolean {
  if (pathname.startsWith("/rootsyncai")) return true;
  if (pathname === "/rootsync" || pathname.startsWith("/rootsync/")) return true;
  if (pathname.startsWith("/discover")) return true;
  if (pathname.startsWith("/marketplace")) return true;
  if (pathname.startsWith("/community")) return true;
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
